"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Data Nasabah" },
  { href: "/meetings", label: "Jadwal Verifikasi" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-charcoal text-zinc-200 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <span className="text-lg font-semibold text-gold">Solid</span>
        <span className="text-sm text-zinc-400">Video Verification</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                active ? "bg-gold text-charcoal" : "text-zinc-300 hover:bg-charcoal-light hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <Link
            href="/users"
            className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith("/users") ? "bg-gold text-charcoal" : "text-zinc-300 hover:bg-charcoal-light hover:text-white"
            }`}
          >
            Manajemen Staf
          </Link>
        )}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-zinc-500">
        Solid Gold Berjangka &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
