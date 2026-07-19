<?php

namespace App\Services;

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\EgressServiceClient;
use Agence104\LiveKit\EncodedOutputs;
use Agence104\LiveKit\RoomCreateOptions;
use Agence104\LiveKit\RoomServiceClient;
use App\Models\Meeting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Livekit\EncodedFileOutput;
use Livekit\S3Upload;

class LiveKitService
{
    protected string $apiKey;

    protected string $apiSecret;

    protected string $host;

    public function __construct()
    {
        $this->apiKey = (string) config('services.livekit.api_key');
        $this->apiSecret = (string) config('services.livekit.api_secret');
        $this->host = (string) config('services.livekit.host');
    }

    public static function generateRoomName(): string
    {
        return 'room-'.Str::uuid();
    }

    /**
     * Best-effort room creation. Rooms auto-create on first participant join
     * (see infrastructure/livekit/livekit.yaml `room.auto_create`), so a
     * failure here (e.g. LiveKit server unreachable in local dev) must not
     * block starting a meeting.
     */
    public function createRoom(string $roomName): void
    {
        try {
            $client = new RoomServiceClient($this->host, $this->apiKey, $this->apiSecret);
            $client->createRoom(new RoomCreateOptions([
                'name' => $roomName,
                'emptyTimeout' => 300,
                'maxParticipants' => 2,
            ]));
        } catch (\Throwable $e) {
            Log::warning('LiveKit createRoom failed', ['room' => $roomName, 'error' => $e->getMessage()]);
        }
    }

    public function closeRoom(string $roomName): void
    {
        try {
            $client = new RoomServiceClient($this->host, $this->apiKey, $this->apiSecret);
            $client->deleteRoom($roomName);
        } catch (\Throwable $e) {
            Log::warning('LiveKit deleteRoom failed', ['room' => $roomName, 'error' => $e->getMessage()]);
        }
    }

    public function removeParticipant(string $roomName, string $identity): void
    {
        try {
            $client = new RoomServiceClient($this->host, $this->apiKey, $this->apiSecret);
            $client->removeParticipant($roomName, $identity);
        } catch (\Throwable $e) {
            Log::warning('LiveKit removeParticipant failed', ['room' => $roomName, 'identity' => $identity, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Issue a scoped participant token. Staff and customer always receive
     * distinct identities and neither the API key nor secret ever reach
     * the browser — only the signed JWT is returned.
     */
    public function generateParticipantToken(Meeting $meeting, string $identity, string $displayName): string
    {
        $token = new AccessToken($this->apiKey, $this->apiSecret, new AccessTokenOptions([
            'identity' => $identity,
            'name' => $displayName,
            'ttl' => 6 * 60 * 60,
        ]));

        $grant = new \Agence104\LiveKit\VideoGrant();
        $grant->setRoomJoin(true);
        $grant->setRoomName($meeting->room_name);
        $grant->setCanPublish(true);
        $grant->setCanSubscribe(true);
        $grant->setCanPublishData(true);

        $token->setGrant($grant);

        return $token->toJwt();
    }

    /**
     * Records only the customer's audio+video via Participant Egress, not a
     * Room Composite (headless-Chrome) render of both parties — the modest
     * VPS this runs on doesn't have the CPU/RAM headroom for that, and the
     * verification review only needs the customer's face on camera anyway.
     * Failure is non-fatal: a recording that never starts shouldn't stop
     * staff from doing the actual verification call.
     */
    public function startRecording(Meeting $meeting): ?string
    {
        try {
            $client = new EgressServiceClient($this->host, $this->apiKey, $this->apiSecret);

            $fileOutput = new EncodedFileOutput([
                'filepath' => $this->recordingObjectKey($meeting),
                's3' => new S3Upload([
                    'access_key' => (string) config('filesystems.disks.recordings.key'),
                    'secret' => (string) config('filesystems.disks.recordings.secret'),
                    'region' => (string) config('filesystems.disks.recordings.region'),
                    'endpoint' => (string) config('filesystems.disks.recordings.endpoint'),
                    'bucket' => (string) config('filesystems.disks.recordings.bucket'),
                    'force_path_style' => true,
                ]),
            ]);

            // Wrapping in EncodedOutputs (rather than passing $fileOutput
            // bare) matters: the SDK's startParticipantEgress() otherwise
            // also stuffs the raw EncodedFileOutput into a `file` property
            // that ParticipantEgressRequest's current proto schema doesn't
            // have (only the repeated `file_outputs`), throwing "Invalid
            // message property: file". The EncodedOutputs branch skips that
            // broken assignment and only populates `file_outputs`.
            $output = new EncodedOutputs(['file' => $fileOutput]);

            $info = $client->startParticipantEgress(
                $meeting->room_name,
                $this->customerIdentity($meeting),
                $output
            );

            return $info->getEgressId();
        } catch (\Throwable $e) {
            Log::warning('LiveKit startParticipantEgress failed', ['meeting' => $meeting->uuid, 'error' => $e->getMessage()]);

            return null;
        }
    }

    public function stopEgress(string $egressId): void
    {
        try {
            $client = new EgressServiceClient($this->host, $this->apiKey, $this->apiSecret);
            $client->stopEgress($egressId);
        } catch (\Throwable $e) {
            Log::warning('LiveKit stopEgress failed', ['egress_id' => $egressId, 'error' => $e->getMessage()]);
        }
    }

    public function recordingObjectKey(Meeting $meeting): string
    {
        return "{$meeting->uuid}.mp4";
    }

    public function staffIdentity(Meeting $meeting): string
    {
        return 'staff-'.$meeting->uuid;
    }

    public function customerIdentity(Meeting $meeting): string
    {
        return 'customer-'.$meeting->uuid;
    }

    public function url(): string
    {
        return (string) config('services.livekit.url');
    }
}
