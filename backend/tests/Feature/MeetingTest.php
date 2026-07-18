<?php

namespace Tests\Feature;

use App\Enums\MeetingStatus;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeetingTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_create_meeting_for_self(): void
    {
        $staff = User::factory()->create(['role' => UserRole::Staff]);
        $customer = Customer::factory()->create();

        $response = $this->actingAs($staff)->postJson('/api/v1/meetings', [
            'customer_uuid' => $customer->uuid,
            'staff_uuid' => $staff->uuid,
            'title' => 'Verifikasi Nasabah Baru',
            'scheduled_at' => now()->addDay()->toIso8601String(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'scheduled')
            ->assertJsonPath('data.result', 'pending');

        $this->assertNotEmpty($response->json('data.invitation_url'));
        $this->assertDatabaseHas('meetings', ['title' => 'Verifikasi Nasabah Baru', 'staff_id' => $staff->id]);
    }

    public function test_staff_cannot_assign_meeting_to_another_staff(): void
    {
        $staff = User::factory()->create(['role' => UserRole::Staff]);
        $otherStaff = User::factory()->create(['role' => UserRole::Staff]);
        $customer = Customer::factory()->create();

        $response = $this->actingAs($staff)->postJson('/api/v1/meetings', [
            'customer_uuid' => $customer->uuid,
            'staff_uuid' => $otherStaff->uuid,
            'title' => 'Verifikasi Nasabah',
            'scheduled_at' => now()->addDay()->toIso8601String(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('meetings', ['title' => 'Verifikasi Nasabah', 'staff_id' => $staff->id]);
    }

    public function test_staff_cannot_view_another_staffs_meeting(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $owner->id]);

        $response = $this->actingAs($intruder)->getJson("/api/v1/meetings/{$meeting->uuid}");

        $response->assertStatus(403);
    }

    public function test_admin_can_view_any_meeting(): void
    {
        $admin = User::factory()->admin()->create();
        $meeting = Meeting::factory()->create();

        $response = $this->actingAs($admin)->getJson("/api/v1/meetings/{$meeting->uuid}");

        $response->assertOk();
    }

    public function test_assigned_staff_can_start_meeting(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'scheduled_at' => now(),
        ]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/start");

        $response->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('meetings', ['id' => $meeting->id, 'status' => MeetingStatus::Active->value]);
    }

    public function test_meeting_cannot_start_too_early_for_non_admin(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create([
            'staff_id' => $staff->id,
            'scheduled_at' => now()->addDays(3),
        ]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/start");

        $response->assertStatus(422)->assertJsonPath('error.code', 'MEETING_TOO_EARLY');
    }

    public function test_staff_can_issue_join_token_for_own_meeting(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/join-token");

        $response->assertOk()->assertJsonStructure(['data' => ['url', 'token', 'identity', 'room_name']]);
    }

    public function test_staff_cannot_issue_join_token_for_others_meeting(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $owner->id]);

        $response = $this->actingAs($intruder)->postJson("/api/v1/meetings/{$meeting->uuid}/join-token");

        $response->assertStatus(403);
    }

    public function test_meeting_cannot_end_without_result(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'status' => MeetingStatus::Active, 'started_at' => now()->subMinutes(5)]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/end", [
            'result' => 'pending',
        ]);

        $response->assertStatus(422)->assertJsonPath('error.code', 'RESULT_REQUIRED');
    }

    public function test_staff_can_end_meeting_with_result(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id, 'status' => MeetingStatus::Active, 'started_at' => now()->subMinutes(10)]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/end", [
            'result' => 'verified',
            'staff_notes' => 'Identitas sesuai KTP.',
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'completed')->assertJsonPath('data.result', 'verified');
        $this->assertNotNull($response->json('data.duration_seconds'));
    }

    public function test_staff_can_cancel_meeting(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->create(['staff_id' => $staff->id]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/cancel");

        $response->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    public function test_completed_meeting_cannot_be_cancelled(): void
    {
        $staff = User::factory()->create();
        $meeting = Meeting::factory()->completed()->create(['staff_id' => $staff->id]);

        $response = $this->actingAs($staff)->postJson("/api/v1/meetings/{$meeting->uuid}/cancel");

        $response->assertStatus(422)->assertJsonPath('error.code', 'MEETING_NOT_CANCELLABLE');
    }
}
