<?php

namespace App\Http\Requests\Meeting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_uuid' => ['required', 'uuid', 'exists:customers,uuid'],
            'staff_uuid' => [
                'nullable',
                'uuid',
                Rule::exists('users', 'uuid')->where('role', 'staff')->where('is_active', true),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'scheduled_at' => ['required', 'date'],
        ];
    }
}
