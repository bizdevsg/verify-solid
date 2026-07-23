"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Customer } from "@/lib/types";
import { CustomerInput } from "@/hooks/useCustomers";

const schema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi").max(255),
  email: z.union([z.literal(""), z.string().email("Format email tidak valid")]).optional(),
  phone: z.string().min(1, "Nomor telepon wajib diisi").max(30),
  identity_number: z.string().min(1, "Nomor identitas wajib diisi").max(50),
});

type FormValues = z.infer<typeof schema>;

export function CustomerForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Simpan",
}: {
  defaultValues?: Partial<Customer>;
  onSubmit: (values: CustomerInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: defaultValues?.full_name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      identity_number: defaultValues?.identity_number ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      ...values,
      email: values.email || null,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-border bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Lengkap" error={errors.full_name?.message}>
          <input {...register("full_name")} className={inputClass} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" className={inputClass} />
        </Field>
        <Field label="Nomor Telepon" error={errors.phone?.message}>
          <input {...register("phone")} className={inputClass} />
        </Field>
        <Field label="Nomor Identitas (KTP)" error={errors.identity_number?.message}>
          <input {...register("identity_number")} className={inputClass} />
        </Field>
      </div>

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
