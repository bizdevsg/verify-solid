<?php

namespace Tests\Feature;

use App\Models\Meeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_delete_a_staff_account_with_no_meetings(): void
    {
        $admin = User::factory()->admin()->create();
        $staff = User::factory()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/v1/users/{$staff->uuid}");

        $response->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $staff->id]);
    }

    public function test_admin_cannot_delete_their_own_account(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/v1/users/{$admin->uuid}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_cannot_delete_staff_with_meeting_history(): void
    {
        $admin = User::factory()->admin()->create();
        $staff = User::factory()->create();
        Meeting::factory()->create(['staff_id' => $staff->id]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/users/{$staff->uuid}");

        $response->assertStatus(422)->assertJsonPath('error.code', 'USER_HAS_MEETINGS');
        $this->assertDatabaseHas('users', ['id' => $staff->id]);
    }

    public function test_staff_cannot_delete_any_account(): void
    {
        $staff = User::factory()->create();
        $otherStaff = User::factory()->create();

        $response = $this->actingAs($staff)->deleteJson("/api/v1/users/{$otherStaff->uuid}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $otherStaff->id]);
    }
}
