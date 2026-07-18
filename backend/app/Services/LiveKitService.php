<?php

namespace App\Services;

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\RoomCreateOptions;
use Agence104\LiveKit\RoomServiceClient;
use App\Models\Meeting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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
