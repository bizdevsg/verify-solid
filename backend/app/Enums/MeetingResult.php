<?php

namespace App\Enums;

enum MeetingResult: string
{
    case Pending = 'pending';
    case Verified = 'verified';
    case NotVerified = 'not_verified';
    case FollowUp = 'follow_up';
}
