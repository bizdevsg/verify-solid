<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\MeetingResult;
use App\Enums\MeetingStatus;
use App\Enums\ParticipantType;
use App\Enums\RecordingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Meeting\MeetingNotesRequest;
use App\Http\Requests\Meeting\StoreMeetingRequest;
use App\Http\Requests\Meeting\UpdateMeetingRequest;
use App\Http\Resources\MeetingResource;
use App\Models\Customer;
use App\Models\Meeting;
use App\Services\LiveKitService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MeetingController extends Controller
{
    public function __construct(protected LiveKitService $liveKit) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Meeting::class);

        $user = $request->user();
        $query = Meeting::query()->with(['customer', 'staff']);

        if (! $user->isAdmin()) {
            $query->where('staff_id', $user->id);
        }

        if ($status = $request->string('status')->trim()->value()) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('meeting_code', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('full_name', 'like', "%{$search}%"));
            });
        }

        $meetings = $query->orderByDesc('scheduled_at')->paginate($request->integer('per_page', 15));

        return $this->success([
            'items' => MeetingResource::collection($meetings->items()),
            'meta' => [
                'current_page' => $meetings->currentPage(),
                'last_page' => $meetings->lastPage(),
                'per_page' => $meetings->perPage(),
                'total' => $meetings->total(),
            ],
        ]);
    }

    public function store(StoreMeetingRequest $request)
    {
        $this->authorize('create', Meeting::class);

        $data = $request->validated();
        $customer = Customer::where('uuid', $data['customer_uuid'])->firstOrFail();

        $staffId = $request->user()->id;
        if ($request->user()->isAdmin() && ! empty($data['staff_uuid'])) {
            $staffId = \App\Models\User::where('uuid', $data['staff_uuid'])->firstOrFail()->id;
        }

        $token = Meeting::generateInvitationToken();
        $scheduledAt = \Illuminate\Support\Carbon::parse($data['scheduled_at']);

        $meeting = Meeting::create([
            'meeting_code' => Meeting::generateMeetingCode(),
            'customer_id' => $customer->id,
            'staff_id' => $staffId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'scheduled_at' => $scheduledAt,
            'invitation_token_hash' => Meeting::hashInvitationToken($token),
            'invitation_expires_at' => now()->max($scheduledAt)->addHours(24),
            'status' => MeetingStatus::Scheduled,
            'result' => MeetingResult::Pending,
        ]);

        $meeting->recordEvent('meeting_created', 'Meeting dibuat oleh '.$request->user()->name);

        $meeting->setAttribute('plainInvitationToken', $token);
        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Meeting berhasil dibuat.', 201);
    }

    public function show(Meeting $meeting)
    {
        $this->authorize('view', $meeting);

        $meeting->load(['customer', 'staff', 'events' => fn ($q) => $q->orderByDesc('created_at')]);

        return $this->success(new MeetingResource($meeting));
    }

    public function update(UpdateMeetingRequest $request, Meeting $meeting)
    {
        $this->authorize('update', $meeting);

        if ($meeting->status !== MeetingStatus::Scheduled) {
            return $this->error('Hanya meeting berstatus terjadwal yang dapat diubah.', 'MEETING_NOT_EDITABLE');
        }

        $data = $request->validated();

        if (isset($data['customer_uuid'])) {
            $data['customer_id'] = Customer::where('uuid', $data['customer_uuid'])->firstOrFail()->id;
            unset($data['customer_uuid']);
        }

        if (isset($data['staff_uuid'])) {
            if ($request->user()->isAdmin()) {
                $data['staff_id'] = \App\Models\User::where('uuid', $data['staff_uuid'])->firstOrFail()->id;
            }
            unset($data['staff_uuid']);
        }

        $meeting->update($data);
        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Meeting berhasil diperbarui.');
    }

    public function start(Request $request, Meeting $meeting)
    {
        $this->authorize('update', $meeting);

        if (in_array($meeting->status, [MeetingStatus::Completed, MeetingStatus::Cancelled, MeetingStatus::Expired], true)) {
            return $this->error('Meeting ini tidak dapat dimulai.', 'MEETING_NOT_STARTABLE');
        }

        if (! $request->user()->isAdmin() && now()->lt($meeting->scheduled_at->copy()->subMinutes(15))) {
            return $this->error('Meeting belum dapat dimulai sebelum jadwal.', 'MEETING_TOO_EARLY');
        }

        $this->liveKit->createRoom($meeting->room_name);

        $meeting->status = MeetingStatus::Active;
        $meeting->started_at ??= now();

        if ($meeting->recording_status !== RecordingStatus::Recording) {
            $egressId = $this->liveKit->startRecording($meeting);
            $meeting->egress_id = $egressId;
            $meeting->recording_status = $egressId ? RecordingStatus::Recording : RecordingStatus::Failed;
        }

        $meeting->save();

        $meeting->participants()->updateOrCreate(
            ['meeting_id' => $meeting->id, 'participant_type' => ParticipantType::Staff],
            ['participant_id' => $request->user()->id, 'participant_name' => $request->user()->name, 'joined_at' => now()]
        );

        $meeting->recordEvent('meeting_started', 'Meeting dimulai oleh '.$request->user()->name);
        $meeting->recordEvent('staff_joined', $request->user()->name.' bergabung.');
        if ($meeting->recording_status === RecordingStatus::Recording) {
            $meeting->recordEvent('recording_started', 'Perekaman video dimulai.');
        }

        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Meeting dimulai.');
    }

    public function end(MeetingNotesRequest $request, Meeting $meeting)
    {
        $this->authorize('update', $meeting);

        if ($meeting->status === MeetingStatus::Completed) {
            return $this->error('Meeting sudah selesai.', 'MEETING_ALREADY_COMPLETED');
        }

        $data = $request->validated();

        if ($data['result'] === MeetingResult::Pending->value) {
            return $this->error('Pilih hasil verifikasi sebelum mengakhiri meeting.', 'RESULT_REQUIRED');
        }

        $meeting->staff_notes = $data['staff_notes'] ?? $meeting->staff_notes;
        $meeting->result = $data['result'];
        $meeting->ended_at = now();
        $meeting->duration_seconds = $meeting->started_at ? $meeting->ended_at->diffInSeconds($meeting->started_at, true) : 0;
        $meeting->status = MeetingStatus::Completed;

        if ($meeting->recording_status === RecordingStatus::Recording && $meeting->egress_id) {
            $this->liveKit->stopEgress($meeting->egress_id);
            $meeting->recording_status = RecordingStatus::Processing;
        }

        $meeting->save();

        $this->liveKit->closeRoom($meeting->room_name);
        $meeting->recordEvent('meeting_ended', 'Meeting diakhiri oleh '.$request->user()->name);

        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Meeting berhasil diakhiri.');
    }

    public function cancel(Request $request, Meeting $meeting)
    {
        $this->authorize('update', $meeting);

        if (in_array($meeting->status, [MeetingStatus::Completed, MeetingStatus::Cancelled], true)) {
            return $this->error('Meeting ini tidak dapat dibatalkan.', 'MEETING_NOT_CANCELLABLE');
        }

        $meeting->status = MeetingStatus::Cancelled;

        if ($meeting->recording_status === RecordingStatus::Recording && $meeting->egress_id) {
            $this->liveKit->stopEgress($meeting->egress_id);
            $meeting->recording_status = RecordingStatus::Processing;
        }

        $meeting->save();

        $this->liveKit->closeRoom($meeting->room_name);
        $meeting->recordEvent('meeting_cancelled', 'Meeting dibatalkan oleh '.$request->user()->name);

        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Meeting berhasil dibatalkan.');
    }

    public function notes(MeetingNotesRequest $request, Meeting $meeting)
    {
        $this->authorize('update', $meeting);

        $meeting->update($request->validated());

        $meeting->recordEvent('notes_updated', 'Catatan diperbarui oleh '.$request->user()->name);

        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Catatan berhasil disimpan.');
    }

    public function joinToken(Request $request, Meeting $meeting)
    {
        $this->authorize('view', $meeting);

        if (! $meeting->isJoinable()) {
            return $this->error('Meeting ini tidak dapat diikuti.', 'MEETING_NOT_JOINABLE');
        }

        $identity = $this->liveKit->staffIdentity($meeting);
        $token = $this->liveKit->generateParticipantToken($meeting, $identity, $request->user()->name);

        return $this->success([
            'url' => $this->liveKit->url(),
            'token' => $token,
            'identity' => $identity,
            'room_name' => $meeting->room_name,
        ]);
    }

    /**
     * Streams the recording through our own authenticated route rather than
     * handing out a signed S3/MinIO URL — every byte requested still goes
     * through `authorize('view', ...)`, so there's never a link that works
     * without a valid staff/admin session.
     */
    public function downloadRecording(Meeting $meeting)
    {
        $this->authorize('view', $meeting);

        if ($meeting->recording_status !== RecordingStatus::Ready) {
            return $this->error('Rekaman belum tersedia.', 'RECORDING_NOT_READY');
        }

        $disk = Storage::disk('recordings');
        $key = $this->liveKit->recordingObjectKey($meeting);

        if (! $disk->exists($key)) {
            return $this->error('File rekaman tidak ditemukan.', 'RECORDING_FILE_MISSING');
        }

        return $disk->download($key, "{$meeting->meeting_code}.mp4");
    }

    public function regenerateInvitation(Request $request, Meeting $meeting)
    {
        $this->authorize('update', $meeting);

        if (in_array($meeting->status, [MeetingStatus::Completed, MeetingStatus::Cancelled], true)) {
            return $this->error('Meeting ini sudah tidak aktif.', 'MEETING_INACTIVE');
        }

        $token = Meeting::generateInvitationToken();

        $meeting->invitation_token_hash = Meeting::hashInvitationToken($token);
        $meeting->invitation_expires_at = now()->addHours(24);
        $meeting->save();

        $meeting->recordEvent('invitation_regenerated', 'Tautan undangan diperbarui oleh '.$request->user()->name);

        $meeting->setAttribute('plainInvitationToken', $token);
        $meeting->load(['customer', 'staff']);

        return $this->success(new MeetingResource($meeting), 'Tautan undangan berhasil dibuat ulang.');
    }
}
