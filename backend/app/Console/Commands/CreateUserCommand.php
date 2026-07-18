<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateUserCommand extends Command
{
    /**
     * Production bootstrap tool — the demo seeder (php artisan db:seed) creates
     * fixtures with well-known passwords and must never run against a real
     * database. Use this command to create the first real admin/staff account.
     */
    protected $signature = 'app:create-user
        {--name= : Full name}
        {--email= : Login email}
        {--role=staff : admin or staff}
        {--password= : Plain password (you will be prompted if omitted)}';

    protected $description = 'Create an admin or staff user account';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Nama lengkap');
        $email = $this->option('email') ?: $this->ask('Email');
        $role = $this->option('role') ?: $this->choice('Peran', ['admin', 'staff'], 1);
        $password = $this->option('password') ?: $this->secret('Kata sandi (min. 8 karakter)');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'role' => $role, 'password' => $password],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'role' => ['required', 'in:admin,staff'],
                'password' => ['required', Password::min(8)],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => UserRole::from($role),
            'is_active' => true,
        ]);

        $this->info("Akun {$user->role->value} '{$user->email}' berhasil dibuat.");

        return self::SUCCESS;
    }
}
