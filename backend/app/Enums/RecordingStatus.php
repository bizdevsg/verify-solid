<?php

namespace App\Enums;

/**
 * Recording is not implemented in this MVP — reserved for a future
 * LiveKit Egress integration. See README "Known limitations".
 */
enum RecordingStatus: string
{
    case None = 'none';
    case Recording = 'recording';
    case Processing = 'processing';
    case Ready = 'ready';
    case Failed = 'failed';
}
