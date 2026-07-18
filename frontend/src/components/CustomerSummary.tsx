import Link from "next/link";
import { Meeting } from "@/lib/types";

export function CustomerSummary({ meeting }: { meeting: Meeting }) {
  return (
    <div className="rounded-lg border border-gray-border bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Informasi Nasabah</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-zinc-400">Nama</dt>
          <dd className="font-medium text-zinc-800">{meeting.customer.full_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Telepon</dt>
          <dd className="text-zinc-700">{meeting.customer.phone}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Petugas</dt>
          <dd className="text-zinc-700">{meeting.staff.name}</dd>
        </div>
      </dl>
      <Link href={`/customers/${meeting.customer.uuid}`} className="mt-3 inline-block text-sm font-medium text-gold hover:underline">
        Lihat Profil Nasabah
      </Link>
    </div>
  );
}
