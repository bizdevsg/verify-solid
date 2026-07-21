<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->dropColumn('egress_id');
            // Agora's stop-recording call needs both the resource ID (from
            // acquire) and the recording session ID (sid, from start) to
            // stop a specific recording job — LiveKit only needed one ID.
            $table->string('agora_resource_id')->nullable()->after('recording_url');
            $table->string('agora_recording_sid')->nullable()->after('agora_resource_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->dropColumn(['agora_resource_id', 'agora_recording_sid']);
            $table->string('egress_id')->nullable()->after('recording_url');
        });
    }
};
