<?php

namespace App\Http\Controllers\Api\V1;

use Agence104\LiveKit\WebhookReceiver;
use App\Enums\RecordingStatus;
use App\Http\Controllers\Controller;
use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Livekit\EgressStatus;

class LiveKitWebhookController extends Controller
{
    /**
     * LiveKit calls this directly (not through the SPA), so there's no
     * Sanctum session — trust is established purely via the signed JWT in
     * the Authorization header, verified against the same API key/secret
     * used to issue participant tokens.
     */
    public function handle(Request $request)
    {
        $receiver = new WebhookReceiver(
            config('services.livekit.api_key'),
            config('services.livekit.api_secret')
        );

        try {
            $event = $receiver->receive($request->getContent(), $request->header('Authorization'));
        } catch (\Throwable $e) {
            Log::warning('LiveKit webhook signature verification failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'invalid webhook signature'], Response::HTTP_UNAUTHORIZED);
        }

        if ($event->getEvent() === 'egress_ended') {
            $this->handleEgressEnded($event->getEgressInfo());
        }

        return response()->json(['success' => true]);
    }

    private function handleEgressEnded(\Livekit\EgressInfo $egressInfo): void
    {
        $meeting = Meeting::where('egress_id', $egressInfo->getEgressId())->first();

        if (! $meeting) {
            return;
        }

        if ($egressInfo->getStatus() === EgressStatus::EGRESS_COMPLETE) {
            $meeting->recording_status = RecordingStatus::Ready;
            $meeting->recording_url = $meeting->uuid.'.mp4';
            $meeting->recordEvent('recording_ready', 'Rekaman video siap diunduh.');
        } else {
            $meeting->recording_status = RecordingStatus::Failed;
            $meeting->recordEvent('recording_failed', 'Perekaman video gagal diproses.');
        }

        $meeting->save();
    }
}
