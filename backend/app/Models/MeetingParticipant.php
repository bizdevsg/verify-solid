<?php

namespace App\Models;

use App\Enums\ParticipantType;
use Illuminate\Database\Eloquent\Model;

class MeetingParticipant extends Model
{
    protected $fillable = [
        'meeting_id',
        'participant_type',
        'participant_id',
        'participant_name',
        'joined_at',
        'left_at',
    ];

    protected function casts(): array
    {
        return [
            'participant_type' => ParticipantType::class,
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
        ];
    }

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }
}
