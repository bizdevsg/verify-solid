<?php

namespace App\Http\Requests\Meeting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_uuid' => ['sometimes', 'required', 'uuid', 'exists:customers,uuid'],
            'staff_uuid' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('users', 'uuid')->where('role', 'staff')->where('is_active', true),
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'scheduled_at' => ['sometimes', 'required', 'date'],
        ];
    }
}
