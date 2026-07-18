<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'meeting_id',
        'event_type',
        'description',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }
}
