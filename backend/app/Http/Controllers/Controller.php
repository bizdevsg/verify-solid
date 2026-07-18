<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

abstract class Controller
{
    use AuthorizesRequests, ValidatesRequests;

    protected function success(mixed $data = null, string $message = 'Berhasil.', int $status = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function error(string $message, string $code, int $status = 422, mixed $errors = null)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'error' => array_filter([
                'code' => $code,
                'details' => $errors,
            ]),
        ], $status);
    }
}
