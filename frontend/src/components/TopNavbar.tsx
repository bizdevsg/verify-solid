"use client";

import { useAuth } from "@/lib/auth-context";

export function TopNavbar({ title }: { title: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-border bg-white px-4 md:px-6">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-800">{user?.name}</p>
          <p className="text-xs capitalize text-zinc-500">{user?.role === "admin" ? "Administrator" : "Petugas"}</p>
        </div>
        <button
          onClick={() => logout()}
          className="rounded-md border border-gray-border px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-gray-light"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
