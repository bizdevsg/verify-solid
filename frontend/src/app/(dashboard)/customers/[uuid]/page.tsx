"use client";

import { use, useState } from "react";
import Link from "next/link";
import { TopNavbar } from "@/components/TopNavbar";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { MeetingTable } from "@/components/MeetingTable";
import { useCustomer } from "@/hooks/useCustomers";
import { formatDate } from "@/lib/format";

export default function CustomerDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const { data: customer, isLoading, isError, refetch } = useCustomer(uuid);
  const [showIdentity, setShowIdentity] = useState(false);

  return (
    <>
      <TopNavbar title="Detail Nasabah" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {customer && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-border bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{customer.full_name}</h2>
                <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  <Info label="Email" value={customer.email || "-"} />
                  <Info label="Telepon" value={customer.phone} />
                  <Info
                    label="No. Identitas"
                    value={
                      <button
                        onClick={() => setShowIdentity((v) => !v)}
                        className="font-mono text-zinc-700 underline decoration-dotted"
                      >
                        {showIdentity ? customer.identity_number : customer.identity_number_masked}
                      </button>
                    }
                  />
                  <Info label="Tanggal Lahir" value={formatDate(customer.date_of_birth)} />
                  <Info label="Alamat" value={customer.address || "-"} />
                  <Info label="Catatan" value={customer.notes || "-"} />
                </dl>
              </div>
              <Link
                href={`/customers/${customer.uuid}/edit`}
                className="rounded-md border border-gray-border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-gray-light"
              >
                Edit Data
              </Link>
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Riwayat Meeting</h3>
                <Link href="/meetings/create" className="text-sm font-medium text-gold hover:underline">
                  Buat Meeting Baru
                </Link>
              </div>
              <MeetingTable meetings={customer.meetings ?? []} variant="recent" />
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="text-zinc-700">{value}</dd>
    </div>
  );
}
