<?php

namespace App\Services;

use App\Models\Meeting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AgoraService
{
    /**
     * Agora uses small 32-bit uids, unique only *within* a channel — since
     * every meeting already gets its own unique channel name, fixed uids
     * per role are enough (no need to derive them from the meeting UUID).
     */
    public const UID_STAFF = 1;

    public const UID_CUSTOMER = 2;

    public const UID_RECORDER = 9999;

    protected string $appId;

    protected string $appCertificate;

    protected string $customerId;

    protected string $customerSecret;

    public function __construct()
    {
        $this->appId = (string) config('services.agora.app_id');
        $this->appCertificate = (string) config('services.agora.app_certificate');
        $this->customerId = (string) config('services.agora.customer_id');
        $this->customerSecret = (string) config('services.agora.customer_secret');
    }

    public static function generateChannelName(): string
    {
        return 'ch-'.Str::uuid();
    }

    public function appId(): string
    {
        return $this->appId;
    }

    /**
     * Every participant (staff, customer, and the recording bot) gets a
     * publisher-role token scoped to one channel — there's no "room" to
     * create ahead of time like LiveKit; the channel exists implicitly for
     * as long as someone is in it.
     */
    public function generateToken(string $channelName, int $uid, int $ttlSeconds = 6 * 60 * 60): string
    {
        return \RtcTokenBuilder2::buildTokenWithUid(
            $this->appId,
            $this->appCertificate,
            $channelName,
            $uid,
            \RtcTokenBuilder2::ROLE_PUBLISHER,
            $ttlSeconds
        );
    }

    /**
     * Starts composite (mix) Cloud Recording — staff and customer combined
     * into one file, uploaded straight to the same MinIO bucket used
     * before. Failure here must never block the meeting itself from
     * starting, so every step is wrapped and just logs a warning.
     */
    public function startRecording(Meeting $meeting): ?array
    {
        try {
            $recorderUid = (string) self::UID_RECORDER;

            $acquire = $this->client()->post('acquire', [
                'cname' => $meeting->room_name,
                'uid' => $recorderUid,
                'clientRequest' => (object) [],
            ]);

            if (! $acquire->successful()) {
                Log::warning('Agora acquire failed', ['meeting' => $meeting->uuid, 'status' => $acquire->status(), 'body' => $acquire->body()]);

                return null;
            }

            $resourceId = $acquire->json('resourceId');
            $token = $this->generateToken($meeting->room_name, self::UID_RECORDER);

            $start = $this->client()->post("resourceid/{$resourceId}/mode/mix/start", [
                'cname' => $meeting->room_name,
                'uid' => $recorderUid,
                'clientRequest' => [
                    'token' => $token,
                    'recordingConfig' => [
                        'channelType' => 0, // Communication profile — matches the 1:1 "rtc" mode clients join with
                        'streamTypes' => 2, // audio + video
                        'maxIdleTime' => 30,
                        // Agora defaults to HLS-only (.m3u8 playlist + separate
                        // .ts segments) when this is omitted, which is useless
                        // for a single downloadable file — we only ever serve
                        // the recording as one MP4 download, never stream it.
                        'avFileType' => ['mp4'],
                        'transcodingConfig' => [
                            'width' => 640,
                            'height' => 360,
                            'fps' => 15,
                            'bitrate' => 500,
                            'mixedVideoLayout' => 1, // best-fit auto layout, both participants visible
                        ],
                    ],
                    'storageConfig' => [
                        'vendor' => 11, // self-built S3-compatible storage (MinIO)
                        'region' => 0,
                        'bucket' => (string) config('filesystems.disks.recordings.bucket'),
                        'accessKey' => (string) config('filesystems.disks.recordings.key'),
                        'secretKey' => (string) config('filesystems.disks.recordings.secret'),
                        'fileNamePrefix' => [$meeting->uuid],
                        'extensionParams' => [
                            'endpoint' => (string) config('services.agora.recording_storage_endpoint'),
                        ],
                    ],
                ],
            ]);

            if (! $start->successful()) {
                Log::warning('Agora start recording failed', ['meeting' => $meeting->uuid, 'status' => $start->status(), 'body' => $start->body()]);

                return null;
            }

            return [
                'resource_id' => $resourceId,
                'sid' => $start->json('sid'),
            ];
        } catch (\Throwable $e) {
            Log::warning('Agora startRecording exception', ['meeting' => $meeting->uuid, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Unlike LiveKit's async egress + webhook, Agora's stop call responds
     * synchronously with the final file list once upload completes — no
     * separate webhook/callback needed to know the recording is ready.
     */
    public function stopRecording(Meeting $meeting): ?string
    {
        if (! $meeting->agora_resource_id || ! $meeting->agora_recording_sid) {
            return null;
        }

        try {
            $resp = $this->client()->post(
                "resourceid/{$meeting->agora_resource_id}/sid/{$meeting->agora_recording_sid}/mode/mix/stop",
                [
                    'cname' => $meeting->room_name,
                    'uid' => (string) self::UID_RECORDER,
                    'clientRequest' => (object) [],
                ]
            );

            if (! $resp->successful()) {
                Log::warning('Agora stop recording failed', ['meeting' => $meeting->uuid, 'status' => $resp->status(), 'body' => $resp->body()]);

                return null;
            }

            $fileList = $resp->json('serverResponse.fileList');

            // Agora reports fileList two ways depending on fileListMode:
            // "json" (array of per-file objects, used when there are
            // multiple output files) or "string" (a single file path,
            // typical for single-file mix/HLS output) — both must be
            // handled or a successfully uploaded recording gets marked
            // Failed even though the file already landed in storage.
            $fileName = null;

            if (is_string($fileList) && $fileList !== '') {
                $fileName = $fileList;
            } elseif (is_array($fileList) && count($fileList) > 0) {
                $entry = collect($fileList)->first(fn ($f) => is_array($f) && ($f['mixedAllUser'] ?? false) === true) ?? $fileList[0];
                $fileName = is_array($entry) ? ($entry['fileName'] ?? null) : $entry;
            }

            if ($fileName) {
                // fileName already includes the fileNamePrefix folder we set
                // in startRecording() (storageConfig.fileNamePrefix), so it
                // must NOT be prefixed with the meeting uuid again here —
                // doing so previously pointed recording_url at a path one
                // level too deep, past where the file actually landed.
                return ltrim((string) $fileName, '/');
            }

            Log::warning('Agora stop recording had no fileList', ['meeting' => $meeting->uuid, 'body' => $resp->body()]);

            return null;
        } catch (\Throwable $e) {
            Log::warning('Agora stopRecording exception', ['meeting' => $meeting->uuid, 'error' => $e->getMessage()]);

            return null;
        }
    }

    protected function client()
    {
        return Http::withBasicAuth($this->customerId, $this->customerSecret)
            ->acceptJson()
            ->timeout(15)
            ->baseUrl("https://api.agora.io/v1/apps/{$this->appId}/cloud_recording/");
    }
}
