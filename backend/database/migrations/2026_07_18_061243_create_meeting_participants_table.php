<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->enum('participant_type', ['staff', 'customer']);
            $table->unsignedBigInteger('participant_id')->nullable();
            $table->string('participant_name');
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->index(['meeting_id', 'participant_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_participants');
    }
};
