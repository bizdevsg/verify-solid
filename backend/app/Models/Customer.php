<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'full_name',
        'email',
        'phone',
        'identity_number',
        'address',
        'date_of_birth',
        'notes',
        'created_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (Customer $customer) {
            $customer->uuid ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function meetings()
    {
        return $this->hasMany(Meeting::class);
    }

    public function maskedIdentityNumber(): string
    {
        $value = $this->identity_number;
        $length = strlen($value);

        if ($length <= 4) {
            return str_repeat('*', $length);
        }

        return str_repeat('*', $length - 4).substr($value, -4);
    }
}
