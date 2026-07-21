<?php

namespace App\Models;

use App\Enums\MeetingResult;
use App\Enums\MeetingStatus;
use App\Enums\RecordingStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Meeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'meeting_code',
        'customer_id',
        'staff_id',
        'title',
        'description',
        'scheduled_at',
        'started_at',
        'ended_at',
        'duration_seconds',
        'room_name',
        'invitation_token_hash',
        'invitation_expires_at',
        'status',
        'staff_notes',
        'result',
        'recording_status',
        'recording_url',
        'agora_resource_id',
        'agora_recording_sid',
    ];

    protected static function booted(): void
    {
        static::creating(function (Meeting $meeting) {
            $meeting->uuid ??= (string) Str::uuid();
            $meeting->room_name ??= 'room-'.Str::uuid();
            $meeting->recording_status ??= \App\Enums\RecordingStatus::None;
        });
    }

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'invitation_expires_at' => 'datetime',
            'status' => MeetingStatus::class,
            'result' => MeetingResult::class,
            'recording_status' => RecordingStatus::class,
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function participants()
    {
        return $this->hasMany(MeetingParticipant::class);
    }

    public function events()
    {
        return $this->hasMany(MeetingEvent::class);
    }

    public static function generateMeetingCode(): string
    {
        do {
            $code = 'SVV-'.strtoupper(Str::random(6));
        } while (static::where('meeting_code', $code)->exists());

        return $code;
    }

    public static function generateInvitationToken(): string
    {
        return Str::random(48);
    }

    public static function hashInvitationToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function findByInvitationToken(string $token): ?self
    {
        return static::where('invitation_token_hash', static::hashInvitationToken($token))->first();
    }

    public function isInvitationExpired(): bool
    {
        return $this->invitation_expires_at->isPast();
    }

    public function isJoinable(): bool
    {
        return ! in_array($this->status, [MeetingStatus::Cancelled, MeetingStatus::Completed, MeetingStatus::Expired], true)
            && ! $this->isInvitationExpired();
    }

    public function recordEvent(string $eventType, ?string $description = null, array $metadata = []): MeetingEvent
    {
        return $this->events()->create([
            'event_type' => $eventType,
            'description' => $description,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
