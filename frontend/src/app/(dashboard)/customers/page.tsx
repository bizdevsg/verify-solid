"use client";

import { useState } from "react";
import Link from "next/link";
import { TopNavbar } from "@/components/TopNavbar";
import { CustomerTable } from "@/components/CustomerTable";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useCustomers } from "@/hooks/useCustomers";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useCustomers({ search, page });

  return (
    <>
      <TopNavbar title="Data Nasabah" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau telepon..."
            className="w-full max-w-xs rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
          <Link
            href="/customers/create"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
          >
            Buat Nasabah
          </Link>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {data && (
          <>
            <CustomerTable customers={data.items} />
            {data.meta.last_page > 1 && (
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>
                  Halaman {data.meta.current_page} dari {data.meta.last_page} ({data.meta.total} nasabah)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border border-gray-border px-3 py-1.5 disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page >= data.meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border border-gray-border px-3 py-1.5 disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
