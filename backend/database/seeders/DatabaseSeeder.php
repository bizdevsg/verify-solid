<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Local development seed data only — do not use these credentials
     * or accounts outside of a local environment.
     */
    public function run(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Administrator',
            'email' => 'admin@example.local',
            'password' => 'password',
        ]);

        $staff = User::factory()->create([
            'name' => 'WPB Demo',
            'email' => 'wpb@example.local',
            'password' => 'password',
            'role' => UserRole::Staff,
        ]);

        $customer = Customer::factory()->create([
            'full_name' => 'Nasabah Demo',
            'email' => 'nasabah@example.local',
            'phone' => '081234567890',
            'created_by' => $staff->id,
        ]);

        Meeting::factory()->create([
            'customer_id' => $customer->id,
            'staff_id' => $staff->id,
            'title' => 'Verifikasi Pembukaan Rekening',
            'scheduled_at' => now()->addDay(),
        ]);

        Meeting::factory()->completed()->create([
            'customer_id' => $customer->id,
            'staff_id' => $staff->id,
            'title' => 'Verifikasi Ulang Dokumen',
        ]);

        Meeting::factory()->cancelled()->create([
            'customer_id' => $customer->id,
            'staff_id' => $staff->id,
            'title' => 'Verifikasi Perubahan Data',
            'scheduled_at' => now()->subDays(2),
        ]);

        Customer::factory(8)->create(['created_by' => $staff->id]);

        Meeting::factory(6)->create([
            'staff_id' => $staff->id,
        ]);
    }
}
