"use client";

import Link from "next/link";
import { Customer } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";

export function CustomerTable({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return <EmptyState title="Belum ada nasabah" description="Data nasabah yang ditambahkan akan muncul di sini." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-border bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-gray-border bg-gray-light text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">Telepon</th>
            <th className="px-4 py-3">No. Identitas</th>
            <th className="px-4 py-3">Meeting</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-border">
          {customers.map((customer) => (
            <tr key={customer.uuid} className="hover:bg-gray-light/60">
              <td className="px-4 py-3 font-medium text-zinc-800">{customer.full_name}</td>
              <td className="px-4 py-3 text-zinc-600">{customer.phone}</td>
              <td className="px-4 py-3 font-mono text-zinc-500">{customer.identity_number_masked}</td>
              <td className="px-4 py-3 text-zinc-500">{customer.meetings_count ?? 0}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/customers/${customer.uuid}`} className="text-sm font-medium text-gold hover:underline">
                  Lihat Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
