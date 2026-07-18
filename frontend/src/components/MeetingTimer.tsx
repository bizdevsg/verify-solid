"use client";

import { useEffect, useState } from "react";
import { formatTimer } from "@/lib/format";

export function MeetingTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono tabular-nums">{formatTimer(elapsed)}</span>;
}
