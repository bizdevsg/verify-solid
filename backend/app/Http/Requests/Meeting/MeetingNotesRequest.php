<?php

namespace App\Http\Requests\Meeting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MeetingNotesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'staff_notes' => ['nullable', 'string', 'max:5000'],
            'result' => ['required', Rule::in(['pending', 'verified', 'not_verified', 'follow_up'])],
        ];
    }
}
