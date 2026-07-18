<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '08'.fake()->numerify('##########'),
            'identity_number' => fake()->numerify('################'),
            'address' => fake()->address(),
            'date_of_birth' => fake()->date('Y-m-d', '-20 years'),
            'notes' => null,
        ];
    }
}
