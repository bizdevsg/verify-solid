<?php

namespace Tests\Feature;

use App\Models\Meeting;
use App\Services\AgoraService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Covers AgoraService::stopRecording() directly against faked Cloud
 * Recording API responses — regression coverage for a real production bug
 * where a successfully uploaded recording still got marked Failed because
 * Agora's fileList can come back as either a JSON array (multiple files)
 * or a bare string (single file), and only the array shape was handled.
 */
class AgoraServiceTest extends TestCase
{
    use RefreshDatabase;

    private function meetingWithRecordingInProgress(): Meeting
    {
        return Meeting::factory()->create([
            'agora_resource_id' => 'RES123',
            'agora_recording_sid' => 'SID456',
        ]);
    }

    public function test_stop_recording_handles_string_file_list(): void
    {
        Http::fake([
            'api.agora.io/*' => Http::response([
                'resourceId' => 'RES123',
                'sid' => 'SID456',
                'serverResponse' => [
                    'fileList' => 'uuid-folder/single-file.mp4',
                ],
            ], 200),
        ]);

        $meeting = $this->meetingWithRecordingInProgress();
        $key = app(AgoraService::class)->stopRecording($meeting);

        $this->assertSame('uuid-folder/single-file.mp4', $key);
    }

    public function test_stop_recording_handles_array_file_list(): void
    {
        Http::fake([
            'api.agora.io/*' => Http::response([
                'resourceId' => 'RES123',
                'sid' => 'SID456',
                'serverResponse' => [
                    'fileList' => [
                        ['fileName' => 'uuid-folder/mixed.mp4', 'mixedAllUser' => true],
                    ],
                ],
            ], 200),
        ]);

        $meeting = $this->meetingWithRecordingInProgress();
        $key = app(AgoraService::class)->stopRecording($meeting);

        $this->assertSame('uuid-folder/mixed.mp4', $key);
    }

    public function test_stop_recording_returns_null_when_file_list_missing(): void
    {
        Http::fake([
            'api.agora.io/*' => Http::response([
                'resourceId' => 'RES123',
                'sid' => 'SID456',
                'serverResponse' => [],
            ], 200),
        ]);

        $meeting = $this->meetingWithRecordingInProgress();
        $key = app(AgoraService::class)->stopRecording($meeting);

        $this->assertNull($key);
    }

    public function test_stop_recording_returns_null_when_api_call_fails(): void
    {
        Http::fake([
            'api.agora.io/*' => Http::response(['error' => 'not found'], 404),
        ]);

        $meeting = $this->meetingWithRecordingInProgress();
        $key = app(AgoraService::class)->stopRecording($meeting);

        $this->assertNull($key);
    }

    public function test_stop_recording_returns_null_without_resource_id(): void
    {
        $meeting = Meeting::factory()->create([
            'agora_resource_id' => null,
            'agora_recording_sid' => null,
        ]);

        $key = app(AgoraService::class)->stopRecording($meeting);

        $this->assertNull($key);
    }
}
