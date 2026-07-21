<?php

namespace Tests\Feature;

use App\Enums\MeetingStatus;
use App\Enums\RecordingStatus;
use App\Models\Meeting;
use App\Models\User;
use App\Services\AgoraService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecordingTest extends TestCase
{
    use RefreshDatabase;

    public function test_starting_meeting_starts_recording_and_stores_resource_id(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'scheduled_at' => now()]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('startRecording')->once()->andReturn(['resource_id' => 'RES123', 'sid' => 'SID456']);
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/start");

        $response->assertOk()->assertJsonPath('data.recording_status', 'recording');
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Recording->value,
            'agora_resource_id' => 'RES123',
            'agora_recording_sid' => 'SID456',
        ]);
        $this->assertDatabaseHas('meeting_events', ['meeting_id' => $meeting->id, 'event_type' => 'recording_started']);
    }

    public function test_meeting_still_starts_when_recording_fails_to_start(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'scheduled_at' => now()]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('startRecording')->once()->andReturn(null);
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/start");

        $response->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'status' => MeetingStatus::Active->value,
            'recording_status' => RecordingStatus::Failed->value,
            'agora_resource_id' => null,
        ]);
    }

    public function test_ending_meeting_stops_recording_and_marks_ready(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'status' => MeetingStatus::Active,
            'started_at' => now()->subMinutes(10),
            'recording_status' => RecordingStatus::Recording,
            'agora_resource_id' => 'RES123',
            'agora_recording_sid' => 'SID456',
        ]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('stopRecording')->once()->andReturn('uuid-folder/mix_file.mp4');
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/end", [
            'result' => 'verified',
        ]);

        // Agora's stop call responds synchronously with the final file, so
        // there's no "processing" limbo state like LiveKit's async egress
        // needed — status goes straight to ready.
        $response->assertOk()->assertJsonPath('data.recording_status', 'ready');
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Ready->value,
            'recording_url' => 'uuid-folder/mix_file.mp4',
        ]);
        $this->assertDatabaseHas('meeting_events', ['meeting_id' => $meeting->id, 'event_type' => 'recording_ready']);
    }

    public function test_ending_meeting_marks_recording_failed_when_stop_fails(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'status' => MeetingStatus::Active,
            'started_at' => now()->subMinutes(10),
            'recording_status' => RecordingStatus::Recording,
            'agora_resource_id' => 'RES123',
            'agora_recording_sid' => 'SID456',
        ]);

        $this->mock(AgoraService::class, function ($mock) {
            $mock->shouldReceive('stopRecording')->once()->andReturn(null);
        });

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/end", [
            'result' => 'verified',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('meetings', [
            'id' => $meeting->id,
            'recording_status' => RecordingStatus::Failed->value,
        ]);
        $this->assertDatabaseHas('meeting_events', ['meeting_id' => $meeting->id, 'event_type' => 'recording_failed']);
    }

    public function test_recording_not_downloadable_before_ready(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'recording_status' => RecordingStatus::Recording]);

        $response = $this->actingAs($staff)->getJson("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertStatus(422)->assertJsonPath('error.code', 'RECORDING_NOT_READY');
    }

    public function test_owner_staff_can_download_ready_recording(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'recording_status' => RecordingStatus::Ready,
            'recording_url' => 'uuid-folder/mix_file.mp4',
        ]);

        $disk = Storage::fake('recordings');
        $disk->put('uuid-folder/mix_file.mp4', 'fake-video-bytes');

        $response = $this->actingAs($staff)->get("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertOk();
        $this->assertSame('fake-video-bytes', $response->streamedContent());
    }

    public function test_other_staff_cannot_download_recording(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $owner->id,
            'recording_status' => RecordingStatus::Ready,
            'recording_url' => 'uuid-folder/mix_file.mp4',
        ]);

        $response = $this->actingAs($intruder)->getJson("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertStatus(403);
    }

    public function test_download_reports_missing_file(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'recording_status' => RecordingStatus::Ready,
            'recording_url' => 'uuid-folder/mix_file.mp4',
        ]);

        Storage::fake('recordings');

        $response = $this->actingAs($staff)->getJson("/api/v1/meetings/{$meeting->uuid}/recording");

        $response->assertStatus(422)->assertJsonPath('error.code', 'RECORDING_FILE_MISSING');
    }

    public function test_deleting_a_completed_meeting_removes_its_recording_file(): void
    {
        $admin = User::factory()->admin()->create();
        $meeting = Meeting::factory()->completed()->create([
            'recording_status' => RecordingStatus::Ready,
            'recording_url' => 'uuid-folder/mix_file.mp4',
        ]);

        $disk = Storage::fake('recordings');
        $disk->put('uuid-folder/mix_file.mp4', 'fake-video-bytes');

        $response = $this->actingAs($admin)->deleteJson("/api/v1/meetings/{$meeting->uuid}");

        $response->assertOk();
        $disk->assertMissing('uuid-folder/mix_file.mp4');
    }
}
