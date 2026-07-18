"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (values: FormValues) => {
    setErrorMessage(null);
    try {
      await login(values);
      router.replace(searchParams.get("redirect") || "/dashboard");
    } catch {
      setErrorMessage("Email atau kata sandi salah.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-xl font-semibold text-charcoal">
            Solid <span className="text-gold">Video Verification</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">Masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Email
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                className="mt-1 w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </label>
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Kata Sandi
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className="mt-1 w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </label>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" {...register("remember")} className="rounded border-gray-border" />
            Ingat saya
          </label>

          {errorMessage && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal transition hover:bg-gold-light disabled:opacity-60"
          >
            {isLoggingIn ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Khusus untuk staf dan admin Solid Gold Berjangka.
        </p>
      </div>
    </div>
  );
}
