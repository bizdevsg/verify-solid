<?php

namespace Tests\Feature;

use App\Enums\MeetingStatus;
use App\Enums\RecordingStatus;
use App\Models\Meeting;
use App\Services\AgoraService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicJoinTest extends TestCase
{
    use RefreshDatabase;

    protected function createMeetingWithToken(array $attributes = []): array
    {
        $token = Meeting::generateInvitationToken();

        $meeting = Meeting::factory()->create([
            ...$attributes,
            'invitation_token_hash' => Meeting::hashInvitationToken($token),
        ]);

        return [$meeting, $token];
    }

    public function test_customer_can_view_meeting_via_valid_token(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'invitation_expires_at' => now()->addDay(),
        ]);

        $response = $this->getJson("/api/v1/public/join/{$token}");

        $response->assertOk()
            ->assertJsonPath('data.title', $meeting->title)
            ->assertJsonPath('data.joinable', true);
    }

    public function test_invalid_token_returns_not_found(): void
    {
        $response = $this->getJson('/api/v1/public/join/not-a-real-token');

        $response->assertStatus(404)->assertJsonPath('error.code', 'INVITATION_NOT_FOUND');
    }

    public function test_expired_invitation_is_rejected(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'invitation_expires_at' => now()->subHour(),
        ]);

        $response = $this->getJson("/api/v1/public/join/{$token}");

        $response->assertOk()->assertJsonPath('data.joinable', false);

        $waitingResponse = $this->postJson("/api/v1/public/join/{$token}/waiting", ['name' => 'Nasabah Uji']);
        $waitingResponse->assertStatus(403)->assertJsonPath('error.code', 'MEETING_NOT_JOINABLE');
    }

    public function test_cancelled_meeting_cannot_be_joined(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Cancelled,
            'invitation_expires_at' => now()->addDay(),
        ]);

        $response = $this->postJson("/api/v1/public/join/{$token}/waiting", ['name' => 'Nasabah Uji']);

        $response->assertStatus(403)->assertJsonPath('error.code', 'MEETING_NOT_JOINABLE');
    }

    public function test_customer_can_enter_waiting_room(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Scheduled,
            'invitation_expires_at' => now()->addDay(),
        ]);

        $response = $this->postJson("/api/v1/public/join/{$token}/waiting", ['name' => 'Nasabah Uji']);

        $response->assertOk()->assertJsonPath('data.status', 'waiting');
        $this->assertDatabaseHas('meeting_participants', [
            'meeting_id' => $meeting->id,
            'participant_name' => 'Nasabah Uji',
        ]);
    }

    public function test_customer_cannot_get_join_token_before_staff_starts(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Waiting,
            'invitation_expires_at' => now()->addDay(),
        ]);

        $response = $this->postJson("/api/v1/public/join/{$token}/join-token", ['name' => 'Nasabah Uji']);

        $response->assertStatus(409)->assertJsonPath('error.code', 'MEETING_NOT_STARTED');
    }

    public function test_customer_can_get_join_token_once_meeting_is_active(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Active,
            'invitation_expires_at' => now()->addDay(),
        ]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('generateToken')->once()->andReturn('fake-jwt');
            $mock->shouldReceive('startRecording')->once()->andReturn(['resource_id' => 'RES123', 'sid' => 'SID456']);
            $mock->shouldReceive('appId')->once()->andReturn('fake-app-id');
        });

        $response = $this->postJson("/api/v1/public/join/{$token}/join-token", ['name' => 'Nasabah Uji']);

        $response->assertOk()->assertJsonStructure(['data' => ['app_id', 'channel', 'token', 'uid']]);
    }

    public function test_customer_joining_starts_recording(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Active,
            'invitation_expires_at' => now()->addDay(),
        ]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('generateToken')->once()->andReturn('fake-jwt');
            $mock->shouldReceive('startRecording')->once()->andReturn(['resource_id' => 'RES123', 'sid' => 'SID456']);
            $mock->shouldReceive('appId')->once()->andReturn('fake-app-id');
        });

        $response = $this->postJson("/api/v1/public/join/{$token}/join-token", ['name' => 'Nasabah Uji']);

        $response->assertOk();
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Recording->value,
            'agora_resource_id' => 'RES123',
            'agora_recording_sid' => 'SID456',
        ]);
        $this->assertDatabaseHas('meeting_events', ['meeting_id' => $meeting->id, 'event_type' => 'recording_started']);
    }

    public function test_customer_still_joins_when_recording_fails_to_start(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Active,
            'invitation_expires_at' => now()->addDay(),
        ]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('generateToken')->once()->andReturn('fake-jwt');
            $mock->shouldReceive('startRecording')->once()->andReturn(null);
            $mock->shouldReceive('appId')->once()->andReturn('fake-app-id');
        });

        $response = $this->postJson("/api/v1/public/join/{$token}/join-token", ['name' => 'Nasabah Uji']);

        $response->assertOk()->assertJsonStructure(['data' => ['app_id', 'channel', 'token', 'uid']]);
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Failed->value,
            'agora_resource_id' => null,
        ]);
    }

    public function test_recording_is_not_restarted_when_customer_reconnects(): void
    {
        [$meeting, $token] = $this->createMeetingWithToken([
            'status' => MeetingStatus::Active,
            'invitation_expires_at' => now()->addDay(),
            'recording_status' => RecordingStatus::Recording,
            'agora_resource_id' => 'RES123',
            'agora_recording_sid' => 'SID456',
        ]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('generateToken')->once()->andReturn('fake-jwt');
            $mock->shouldReceive('startRecording')->never();
            $mock->shouldReceive('appId')->once()->andReturn('fake-app-id');
        });

        $response = $this->postJson("/api/v1/public/join/{$token}/join-token", ['name' => 'Nasabah Uji']);

        $response->assertOk();
    }
}
