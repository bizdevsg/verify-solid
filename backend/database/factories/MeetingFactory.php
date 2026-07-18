<?php

namespace Database\Factories;

use App\Enums\MeetingResult;
use App\Enums\MeetingStatus;
use App\Models\Customer;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Meeting>
 */
class MeetingFactory extends Factory
{
    public function definition(): array
    {
        $token = Meeting::generateInvitationToken();

        return [
            'meeting_code' => Meeting::generateMeetingCode(),
            'customer_id' => Customer::factory(),
            'staff_id' => User::factory(),
            'title' => 'Verifikasi Video Nasabah',
            'description' => fake()->optional()->sentence(),
            'scheduled_at' => fake()->dateTimeBetween('-1 week', '+1 week'),
            'invitation_token_hash' => Meeting::hashInvitationToken($token),
            'invitation_expires_at' => now()->addDays(7),
            'status' => MeetingStatus::Scheduled,
            'result' => MeetingResult::Pending,
        ];
    }

    public function completed(): static
    {
        return $this->state(function (array $attributes) {
            $startedAt = fake()->dateTimeBetween('-1 week', '-1 day');
            $endedAt = (clone $startedAt)->modify('+'.fake()->numberBetween(5, 20).' minutes');

            return [
                'scheduled_at' => $startedAt,
                'started_at' => $startedAt,
                'ended_at' => $endedAt,
                'duration_seconds' => $endedAt->getTimestamp() - $startedAt->getTimestamp(),
                'status' => MeetingStatus::Completed,
                'result' => MeetingResult::Verified,
                'staff_notes' => 'Verifikasi berhasil dilakukan, identitas nasabah sesuai.',
            ];
        });
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => MeetingStatus::Cancelled,
        ]);
    }
}
