<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\MeetingStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\MeetingResource;
use App\Models\Customer;
use App\Models\Meeting;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        $meetingQuery = fn () => $isAdmin ? Meeting::query() : Meeting::query()->where('staff_id', $user->id);
        $customerQuery = fn () => $isAdmin ? Customer::query() : Customer::query()->where('created_by', $user->id);

        $stats = [
            'total_customers' => $customerQuery()->count(),
            'total_meetings' => $meetingQuery()->count(),
            'meetings_today' => $meetingQuery()->whereDate('scheduled_at', today())->count(),
            'upcoming_meetings' => $meetingQuery()->whereIn('status', [MeetingStatus::Scheduled, MeetingStatus::Waiting])->where('scheduled_at', '>=', now())->count(),
            'active_meetings' => $meetingQuery()->where('status', MeetingStatus::Active)->count(),
            'completed_meetings' => $meetingQuery()->where('status', MeetingStatus::Completed)->count(),
            'cancelled_meetings' => $meetingQuery()->where('status', MeetingStatus::Cancelled)->count(),
        ];

        $upcoming = $meetingQuery()
            ->with(['customer', 'staff'])
            ->whereIn('status', [MeetingStatus::Scheduled, MeetingStatus::Waiting])
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->limit(5)
            ->get();

        $recent = $meetingQuery()
            ->with(['customer', 'staff'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return $this->success([
            'stats' => $stats,
            'upcoming_meetings' => MeetingResource::collection($upcoming),
            'recent_meetings' => MeetingResource::collection($recent),
        ]);
    }
}
