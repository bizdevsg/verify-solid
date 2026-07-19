<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\LiveKitWebhookController;
use App\Http\Controllers\Api\V1\MeetingController;
use App\Http\Controllers\Api\V1\Public\JoinController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->middleware('throttle:20,1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
});

Route::prefix('public')->middleware('throttle:60,1')->group(function () {
    Route::get('/join/{token}', [JoinController::class, 'show']);
    Route::post('/join/{token}/waiting', [JoinController::class, 'waiting']);
    Route::post('/join/{token}/join-token', [JoinController::class, 'joinToken']);
});

// Called by the LiveKit server itself, not a browser — no Sanctum session.
// Trust comes from the signed JWT the controller verifies internally.
Route::post('/webhooks/livekit', [LiveKitWebhookController::class, 'handle'])->middleware('throttle:120,1');

Route::middleware(['auth:sanctum', 'role:admin,staff'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('customers', CustomerController::class)
        ->parameters(['customers' => 'customer'])
        ->except(['destroy']);

    Route::apiResource('meetings', MeetingController::class)
        ->parameters(['meetings' => 'meeting'])
        ->except(['destroy']);
    Route::post('/meetings/{meeting}/start', [MeetingController::class, 'start']);
    Route::post('/meetings/{meeting}/end', [MeetingController::class, 'end']);
    Route::post('/meetings/{meeting}/cancel', [MeetingController::class, 'cancel']);
    Route::post('/meetings/{meeting}/join-token', [MeetingController::class, 'joinToken']);
    Route::post('/meetings/{meeting}/notes', [MeetingController::class, 'notes']);
    Route::get('/meetings/{meeting}/recording', [MeetingController::class, 'downloadRecording']);
    Route::post('/meetings/{meeting}/regenerate-invitation', [MeetingController::class, 'regenerateInvitation']);

    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::delete('/meetings/{meeting}', [MeetingController::class, 'destroy']);
    });
});
