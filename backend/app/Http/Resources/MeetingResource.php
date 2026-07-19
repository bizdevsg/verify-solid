<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeetingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'meeting_code' => $this->meeting_code,
            'title' => $this->title,
            'description' => $this->description,
            'customer' => [
                'uuid' => $this->whenLoaded('customer', fn () => $this->customer->uuid),
                'full_name' => $this->whenLoaded('customer', fn () => $this->customer->full_name),
                'phone' => $this->whenLoaded('customer', fn () => $this->customer->phone),
            ],
            'staff' => [
                'uuid' => $this->whenLoaded('staff', fn () => $this->staff->uuid),
                'name' => $this->whenLoaded('staff', fn () => $this->staff->name),
            ],
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'duration_seconds' => $this->duration_seconds,
            'status' => $this->status->value,
            'result' => $this->result->value,
            'staff_notes' => $this->staff_notes,
            'recording_status' => $this->recording_status->value,
            // Never a raw bucket/public URL — this points at our own
            // authenticated download route, so every fetch re-checks the
            // viewer's session instead of relying on a link that keeps
            // working after it's copied or shared. Deliberately relative
            // (no host): nginx serves the frontend and /api/* from the same
            // origin, and a relative path can't drift out of sync with
            // whatever origin the user is actually looking at (unlike
            // config('app.url'), which is the backend container's own view
            // of itself and isn't guaranteed to match the public origin).
            'recording_download_url' => $this->when(
                $this->recording_status->value === 'ready'
                    && ($request->user()?->isAdmin() || $request->user()?->id === $this->staff_id),
                fn () => "/api/v1/meetings/{$this->uuid}/recording"
            ),
            'invitation_expires_at' => $this->invitation_expires_at?->toIso8601String(),
            'invitation_url' => $this->when(
                isset($this->plainInvitationToken),
                fn () => rtrim(config('app.frontend_url'), '/')."/join/{$this->plainInvitationToken}"
            ),
            'events' => MeetingEventResource::collection($this->whenLoaded('events')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
