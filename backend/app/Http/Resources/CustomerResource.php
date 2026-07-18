<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'identity_number' => $this->identity_number,
            'identity_number_masked' => $this->maskedIdentityNumber(),
            'address' => $this->address,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'notes' => $this->notes,
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'meetings_count' => $this->whenCounted('meetings'),
            'meetings' => MeetingResource::collection($this->whenLoaded('meetings')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
