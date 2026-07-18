<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $throttleKey = 'login:'.strtolower($request->input('email')).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return $this->error(
                "Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik.",
                'TOO_MANY_ATTEMPTS',
                429
            );
        }

        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey, 60);

            return $this->error('Email atau kata sandi salah.', 'INVALID_CREDENTIALS', 401);
        }

        RateLimiter::clear($throttleKey);

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();

            return $this->error('Akun anda telah dinonaktifkan.', 'ACCOUNT_INACTIVE', 403);
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return $this->success(new UserResource($user), 'Berhasil masuk.');
    }

    public function logout(\Illuminate\Http\Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->success(null, 'Berhasil keluar.');
    }

    public function me(\Illuminate\Http\Request $request)
    {
        return $this->success(new UserResource($request->user()));
    }
}
