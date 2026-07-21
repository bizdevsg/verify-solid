<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\MeetingStatus;
use App\Enums\ParticipantType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ConfirmJoinRequest;
use App\Models\Meeting;
use App\Services\AgoraService;
use Illuminate\Http\Request;

class JoinController extends Controller
{
    public function __construct(protected AgoraService $agora) {}

    public function show(string $token)
    {
        $meeting = Meeting::findByInvitationToken($token);

        if (! $meeting) {
            return $this->error('Tautan undangan tidak valid.', 'INVITATION_NOT_FOUND', 404);
        }

        if (! $meeting->events()->where('event_type', 'invitation_opened')->exists()) {
            $meeting->recordEvent('invitation_opened', 'Tautan undangan dibuka.');
        }

        return $this->success($this->meetingSummary($meeting));
    }

    public function waiting(ConfirmJoinRequest $request, string $token)
    {
        $meeting = Meeting::findByInvitationToken($token);

        if (! $meeting) {
            return $this->error('Tautan undangan tidak valid.', 'INVITATION_NOT_FOUND', 404);
        }

        if (! $meeting->isJoinable()) {
            return $this->error('Meeting ini tidak dapat diikuti.', 'MEETING_NOT_JOINABLE', 403);
        }

        $meeting->participants()->updateOrCreate(
            ['meeting_id' => $meeting->id, 'participant_type' => ParticipantType::Customer],
            ['participant_name' => $request->validated('name')]
        );

        if ($meeting->status === MeetingStatus::Scheduled) {
            $meeting->status = MeetingStatus::Waiting;
            $meeting->save();
        }

        if (! $meeting->events()->where('event_type', 'customer_waiting')->exists()) {
            $meeting->recordEvent('customer_waiting', $request->validated('name').' menunggu di ruang tunggu.');
        }

        return $this->success($this->meetingSummary($meeting));
    }

    public function joinToken(Request $request, string $token)
    {
        $meeting = Meeting::findByInvitationToken($token);

        if (! $meeting) {
            return $this->error('Tautan undangan tidak valid.', 'INVITATION_NOT_FOUND', 404);
        }

        if (! $meeting->isJoinable()) {
            return $this->error('Meeting ini tidak dapat diikuti.', 'MEETING_NOT_JOINABLE', 403);
        }

        if ($meeting->status !== MeetingStatus::Active) {
            return $this->error('Petugas belum memulai meeting.', 'MEETING_NOT_STARTED', 409);
        }

        $name = (string) $request->string('name', 'Nasabah');
        $uid = AgoraService::UID_CUSTOMER;
        $tokenJwt = $this->agora->generateToken($meeting->room_name, $uid);

        $meeting->participants()->updateOrCreate(
            ['meeting_id' => $meeting->id, 'participant_type' => ParticipantType::Customer],
            ['participant_name' => $name, 'joined_at' => now()]
        );

        if (! $meeting->events()->where('event_type', 'customer_joined')->exists()) {
            $meeting->recordEvent('customer_joined', $name.' bergabung ke meeting.');
        }

        return $this->success([
            'app_id' => $this->agora->appId(),
            'channel' => $meeting->room_name,
            'token' => $tokenJwt,
            'uid' => $uid,
        ]);
    }

    protected function meetingSummary(Meeting $meeting): array
    {
        $meeting->loadMissing(['customer', 'staff']);

        return [
            'title' => $meeting->title,
            'description' => $meeting->description,
            'scheduled_at' => $meeting->scheduled_at->toIso8601String(),
            'status' => $meeting->status->value,
            'staff_name' => $meeting->staff->name,
            'customer_name_hint' => $this->maskName($meeting->customer->full_name),
            'invitation_expires_at' => $meeting->invitation_expires_at->toIso8601String(),
            'joinable' => $meeting->isJoinable(),
        ];
    }

    protected function maskName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        if (count($parts) === 0) {
            return '';
        }

        $first = $parts[0];
        $rest = array_slice($parts, 1);

        return trim($first.' '.implode(' ', array_map(fn ($p) => mb_substr($p, 0, 1).'.', $rest)));
    }
}
