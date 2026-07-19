<?php

namespace App\Enums;

enum RecordingStatus: string
{
    case None = 'none';
    case Recording = 'recording';
    case Processing = 'processing';
    case Ready = 'ready';
    case Failed = 'failed';
}
