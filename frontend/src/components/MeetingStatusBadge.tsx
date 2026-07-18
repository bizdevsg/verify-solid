import { MeetingResult, MeetingStatus } from "@/lib/types";
import { resultLabels, statusLabels } from "@/lib/format";

const statusStyles: Record<MeetingStatus, string> = {
  scheduled: "bg-zinc-100 text-zinc-700",
  waiting: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-zinc-200 text-zinc-500",
};

const resultStyles: Record<MeetingResult, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  verified: "bg-emerald-100 text-emerald-800",
  not_verified: "bg-red-100 text-red-700",
  follow_up: "bg-amber-100 text-amber-800",
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function MeetingResultBadge({ result }: { result: MeetingResult }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${resultStyles[result]}`}>
      {resultLabels[result]}
    </span>
  );
}
