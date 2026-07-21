<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Agora's resourceId routinely exceeds 255 chars (observed up to
        // ~260) — the original varchar(255) truncated the value on save,
        // which threw right after Agora had already started recording,
        // leaving an orphaned session Agora rejects with "task conflict"
        // on any retry. Raw SQL avoids needing doctrine/dbal just for a
        // column type change.
        DB::statement('ALTER TABLE meetings MODIFY agora_resource_id TEXT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE meetings MODIFY agora_resource_id VARCHAR(255) NULL');
    }
};
