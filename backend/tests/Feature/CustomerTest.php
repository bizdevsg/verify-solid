<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_create_customer(): void
    {
        $staff = User::factory()->create(['role' => UserRole::Staff]);

        $response = $this->actingAs($staff)->postJson('/api/v1/customers', [
            'full_name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'phone' => '081234567890',
            'identity_number' => '3271010101990001',
            'address' => 'Jl. Merdeka No. 1',
            'date_of_birth' => '1990-01-01',
        ]);

        $response->assertCreated()->assertJsonPath('data.full_name', 'Budi Santoso');
        $this->assertDatabaseHas('customers', ['full_name' => 'Budi Santoso', 'created_by' => $staff->id]);
    }

    public function test_customer_creation_requires_valid_fields(): void
    {
        $staff = User::factory()->create();

        $response = $this->actingAs($staff)->postJson('/api/v1/customers', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['full_name', 'phone', 'identity_number']);
    }

    public function test_staff_can_update_customer(): void
    {
        $staff = User::factory()->create();
        $customer = Customer::factory()->create(['created_by' => $staff->id]);

        $response = $this->actingAs($staff)->patchJson("/api/v1/customers/{$customer->uuid}", [
            'full_name' => 'Nama Diperbarui',
        ]);

        $response->assertOk()->assertJsonPath('data.full_name', 'Nama Diperbarui');
    }

    public function test_identity_number_is_masked_in_response(): void
    {
        $staff = User::factory()->create();
        $customer = Customer::factory()->create(['identity_number' => '3271010101990099']);

        $response = $this->actingAs($staff)->getJson("/api/v1/customers/{$customer->uuid}");

        $response->assertOk()->assertJsonPath('data.identity_number_masked', '************0099');
    }

    public function test_only_admin_can_delete_customer(): void
    {
        $staff = User::factory()->create(['role' => UserRole::Staff]);
        $customer = Customer::factory()->create();

        $response = $this->actingAs($staff)->deleteJson("/api/v1/customers/{$customer->uuid}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
    }

    public function test_admin_can_delete_customer(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = Customer::factory()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/v1/customers/{$customer->uuid}");

        $response->assertOk();
        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_customer_list_supports_search(): void
    {
        $staff = User::factory()->create();
        Customer::factory()->create(['full_name' => 'Findable Person']);
        Customer::factory()->create(['full_name' => 'Someone Else']);

        $response = $this->actingAs($staff)->getJson('/api/v1/customers?search=Findable');

        $response->assertOk();
        $this->assertCount(1, $response->json('data.items'));
    }
}
