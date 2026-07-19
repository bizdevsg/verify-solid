"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TopNavbar } from "@/components/TopNavbar";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsersList } from "@/hooks/useUsers";
import { AppUser } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  role: z.enum(["admin", "staff"]),
});

type CreateFormValues = z.infer<typeof createSchema>;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, isError, refetch } = useUsersList(true);
  const createUser = useCreateUser();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", role: "staff" },
  });

  if (currentUser && currentUser.role !== "admin") {
    return (
      <>
        <TopNavbar title="Manajemen Staf" />
        <main className="flex-1 p-6">
          <ErrorState message="Halaman ini hanya untuk admin." />
        </main>
      </>
    );
  }

  return (
    <>
      <TopNavbar title="Manajemen Staf" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Kelola akun admin dan petugas.</p>
          <button
            onClick={() => {
              setShowCreate(true);
              setError(null);
              reset();
            }}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
          >
            Buat Akun Staf
          </button>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {users && users.length === 0 && <EmptyState title="Belum ada akun staf" />}

        {users && users.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-border bg-gray-light text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-border">
                {users.map((u) => (
                  <UserRow key={u.uuid} user={u} isSelf={u.uuid === currentUser?.uuid} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
              <h3 className="mb-3 text-base font-semibold text-zinc-900">Buat Akun Staf</h3>
              <form
                onSubmit={handleSubmit((values) => {
                  setError(null);
                  createUser.mutate(values, {
                    onSuccess: () => setShowCreate(false),
                    onError: (err) => setError(getApiErrorMessage(err, "Gagal membuat akun.")),
                  });
                })}
                className="space-y-3"
              >
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-zinc-700">Nama</span>
                  <input {...register("name")} className={inputClass} />
                  {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-zinc-700">Email</span>
                  <input {...register("email")} type="email" className={inputClass} />
                  {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-zinc-700">Kata Sandi</span>
                  <input {...register("password")} type="password" className={inputClass} />
                  {errors.password && <span className="text-xs text-red-600">{errors.password.message}</span>}
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-zinc-700">Peran</span>
                  <select {...register("role")} className={inputClass}>
                    <option value="staff">Petugas</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-md border border-gray-border px-4 py-2 text-sm font-medium text-zinc-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createUser.isPending}
                    className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal disabled:opacity-60"
                  >
                    {createUser.isPending ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function UserRow({ user, isSelf }: { user: AppUser; isSelf: boolean }) {
  const updateUser = useUpdateUser(user.uuid);
  const deleteUser = useDeleteUser(user.uuid);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <>
      <tr className="hover:bg-gray-light/60">
        <td className="px-4 py-3 font-medium text-zinc-800">{user.name}</td>
        <td className="px-4 py-3 text-zinc-600">{user.email}</td>
        <td className="px-4 py-3 capitalize text-zinc-600">{user.role === "admin" ? "Admin" : "Petugas"}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user.is_active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-500"
            }`}
          >
            {user.is_active ? "Aktif" : "Nonaktif"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateUser.mutate({ is_active: !user.is_active })}
                disabled={updateUser.isPending}
                className="text-sm font-medium text-gold hover:underline disabled:opacity-50"
              >
                {user.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
              {!isSelf && (
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDelete(true);
                  }}
                  disabled={deleteUser.isPending}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Hapus
                </button>
              )}
            </div>
            {deleteError && <p className="max-w-xs text-xs text-red-600">{deleteError}</p>}
          </div>
        </td>
      </tr>

      <ConfirmDialog
        open={confirmDelete}
        title={`Hapus Akun ${user.name}?`}
        description="Tindakan ini tidak dapat dibatalkan. Akun yang punya riwayat meeting tidak bisa dihapus — nonaktifkan saja akun tersebut."
        confirmLabel="Ya, Hapus"
        destructive
        isLoading={deleteUser.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteUser.mutate(undefined, {
            onSuccess: () => setConfirmDelete(false),
            onError: (err) => {
              setDeleteError(getApiErrorMessage(err, "Gagal menghapus akun."));
              setConfirmDelete(false);
            },
          });
        }}
      />
    </>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold";
