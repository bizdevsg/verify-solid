<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('meeting_code')->unique();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('scheduled_at');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('room_name')->unique();
            $table->string('invitation_token_hash')->unique();
            $table->timestamp('invitation_expires_at');
            $table->enum('status', ['scheduled', 'waiting', 'active', 'completed', 'cancelled', 'expired'])->default('scheduled');
            $table->text('staff_notes')->nullable();
            $table->enum('result', ['pending', 'verified', 'not_verified', 'follow_up'])->default('pending');
            $table->string('recording_status')->default('none');
            $table->string('recording_url')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('scheduled_at');
            $table->index('staff_id');
            $table->index('invitation_token_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};
