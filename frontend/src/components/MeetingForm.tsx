"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { useCustomers } from "@/hooks/useCustomers";
import { useUsersList } from "@/hooks/useUsers";
import { Meeting } from "@/lib/types";
import { MeetingInput } from "@/hooks/useMeetings";

const schema = z.object({
  customer_uuid: z.string().min(1, "Pilih nasabah"),
  staff_uuid: z.string().optional(),
  title: z.string().min(1, "Judul wajib diisi").max(255),
  description: z.string().max(2000).optional(),
  scheduled_at: z.string().min(1, "Jadwal wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function MeetingForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Simpan",
}: {
  defaultValues?: Partial<Meeting> & { customer_uuid?: string; staff_uuid?: string };
  onSubmit: (values: MeetingInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: customersData } = useCustomers({ per_page: 100 });
  const { data: staffList } = useUsersList(isAdmin);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_uuid: defaultValues?.customer?.uuid ?? defaultValues?.customer_uuid ?? "",
      staff_uuid: defaultValues?.staff?.uuid ?? defaultValues?.staff_uuid ?? "",
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      scheduled_at: toLocalInputValue(defaultValues?.scheduled_at),
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      customer_uuid: values.customer_uuid,
      staff_uuid: values.staff_uuid || null,
      title: values.title,
      description: values.description || null,
      scheduled_at: new Date(values.scheduled_at).toISOString(),
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-border bg-white p-5">
      <Field label="Nasabah" error={errors.customer_uuid?.message}>
        <select {...register("customer_uuid")} className={inputClass}>
          <option value="">Pilih nasabah</option>
          {customersData?.items.map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.full_name} &mdash; {c.phone}
            </option>
          ))}
        </select>
      </Field>

      {isAdmin && (
        <Field label="Petugas" error={errors.staff_uuid?.message}>
          <select {...register("staff_uuid")} className={inputClass}>
            <option value="">Saya sendiri</option>
            {staffList
              ?.filter((u) => u.role === "staff" && u.is_active)
              .map((u) => (
                <option key={u.uuid} value={u.uuid}>
                  {u.name}
                </option>
              ))}
          </select>
        </Field>
      )}

      <Field label="Judul Meeting" error={errors.title?.message}>
        <input {...register("title")} className={inputClass} placeholder="Verifikasi Pembukaan Rekening" />
      </Field>

      <Field label="Deskripsi" error={errors.description?.message}>
        <textarea {...register("description")} rows={3} className={inputClass} />
      </Field>

      <Field label="Jadwal" error={errors.scheduled_at?.message}>
        <input type="datetime-local" {...register("scheduled_at")} className={inputClass} />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal transition hover:bg-gold-light disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan..." : submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
