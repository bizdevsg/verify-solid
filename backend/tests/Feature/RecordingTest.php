<?php

namespace Tests\Feature;

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\VideoGrant;
use App\Enums\MeetingStatus;
use App\Enums\RecordingStatus;
use App\Models\Meeting;
use App\Models\User;
use App\Services\LiveKitService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livekit\EgressInfo;
use Livekit\EgressStatus;
use Livekit\WebhookEvent;
use Tests\TestCase;

class RecordingTest extends TestCase
{
    use RefreshDatabase;

    public function test_starting_meeting_starts_recording_and_stores_egress_id(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'scheduled_at' => now()]);

        $this->mock(LiveKitService::class, function ($mock) {
            $mock->shouldReceive('createRoom')->once();
            $mock->shouldReceive('startRecording')->once()->andReturn('EG_abc123');
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/start");

        $response->assertOk()->assertJsonPath('data.recording_status', 'recording');
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Recording->value,
            'egress_id' => 'EG_abc123',
        ]);
        $this->assertDatabaseHas('meeting_events', ['meeting_id' => $meeting->id, 'event_type' => 'recording_started']);
    }

    public function test_meeting_still_starts_when_egress_fails_to_start(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'scheduled_at' => now()]);

        $this->mock(LiveKitService::class, function ($mock) {
            $mock->shouldReceive('createRoom')->once();
            $mock->shouldReceive('startRecording')->once()->andReturn(null);
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/start");

        $response->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'status' => MeetingStatus::Active->value,
            'recording_status' => RecordingStatus::Failed->value,
            'egress_id' => null,
        ]);
    }

    public function test_ending_meeting_stops_egress_and_marks_processing(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'status' => MeetingStatus::Active,
            'started_at' => now()->subMinutes(10),
            'recording_status' => RecordingStatus::Recording,
            'egress_id' => 'EG_abc123',
        ]);

        $this->mock(LiveKitService::class, function ($mock) {
            $mock->shouldReceive('stopEgress')->once()->with('EG_abc123');
            $mock->shouldReceive('closeRoom')->once();
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/end", [
            'result' => 'verified',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Processing->value,
        ]);
    }

    public function test_webhook_marks_recording_ready_on_egress_complete(): void
    {
        $meeting = Meeting::factory()->create([
            'recording_status' => RecordingStatus::Recording,
            'egress_id' => 'EG_xyz789',
        ]);

        $response = $this->postSignedWebhook($this->egressEndedPayload('EG_xyz789', EgressStatus::EGRESS_COMPLETE));

        $response->assertOk();
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Ready->value,
            'recording_url' => $meeting->uuid.'.mp4',
        ]);
        $this->assertDatabaseHas('meeting_events', ['meeting_id' => $meeting->id, 'event_type' => 'recording_ready']);
    }

    public function test_webhook_marks_recording_failed_on_egress_failure(): void
    {
        $meeting = Meeting::factory()->create([
            'recording_status' => RecordingStatus::Recording,
            'egress_id' => 'EG_broken',
        ]);

        $response = $this->postSignedWebhook($this->egressEndedPayload('EG_broken', EgressStatus::EGRESS_FAILED));

        $response->assertOk();
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Failed->value,
        ]);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $body = $this->egressEndedPayload('EG_xyz789', EgressStatus::EGRESS_COMPLETE);

        $response = $this->call('POST', '/api/v1/webhooks/livekit', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'not-a-real-jwt',
        ], $body);

        $response->assertStatus(401);
    }

    public function test_recording_not_downloadable_before_ready(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'recording_status' => RecordingStatus::Processing]);

        $response = $this->actingAs($staff)->getJson("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertStatus(422)->assertJsonPath('error.code', 'RECORDING_NOT_READY');
    }

    public function test_owner_staff_can_download_ready_recording(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'recording_status' => RecordingStatus::Ready]);

        $disk = Storage::fake('recordings');
        $disk->put(app(LiveKitService::class)->recordingObjectKey($meeting), 'fake-video-bytes');

        $response = $this->actingAs($staff)->get("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertOk();
        $this->assertSame('fake-video-bytes', $response->streamedContent());
    }

    public function test_other_staff_cannot_download_recording(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $owner->id, 'recording_status' => RecordingStatus::Ready]);

        $response = $this->actingAs($intruder)->getJson("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertStatus(403);
    }

    public function test_download_reports_missing_file(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'recording_status' => RecordingStatus::Ready]);

        Storage::fake('recordings');

        $response = $this->actingAs($staff)->getJson("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertStatus(422)->assertJsonPath('error.code', 'RECORDING_FILE_MISSING');
    }

    private function egressEndedPayload(string $egressId, int $status): string
    {
        $egressInfo = new EgressInfo([
            'egress_id' => $egressId,
            'status' => $status,
        ]);

        $event = new WebhookEvent([
            'event' => 'egress_ended',
            'egress_info' => $egressInfo,
        ]);

        return $event->serializeToJsonString();
    }

    private function postSignedWebhook(string $body)
    {
        $token = new AccessToken(config('services.livekit.api_key'), config('services.livekit.api_secret'));
        $token->setGrant(new VideoGrant());
        $token->setSha256(base64_encode(hash('sha256', $body, true)));
        $jwt = $token->toJwt();

        return $this->call('POST', '/api/v1/webhooks/livekit', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => $jwt,
        ], $body);
    }
}
