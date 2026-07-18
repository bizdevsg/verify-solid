"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNavbar } from "@/components/TopNavbar";
import { CustomerForm } from "@/components/CustomerForm";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { getApiErrorMessage } from "@/lib/api";

export default function EditCustomerPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router = useRouter();
  const { data: customer, isLoading, isError, refetch } = useCustomer(uuid);
  const updateCustomer = useUpdateCustomer(uuid);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <TopNavbar title="Edit Nasabah" />
      <main className="flex-1 space-y-4 p-4 md:max-w-2xl md:p-6">
        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {customer && (
          <CustomerForm
            defaultValues={customer}
            isSubmitting={updateCustomer.isPending}
            submitLabel="Simpan Perubahan"
            onSubmit={(values) => {
              setError(null);
              updateCustomer.mutate(values, {
                onSuccess: () => router.push(`/customers/${uuid}`),
                onError: (err) => setError(getApiErrorMessage(err, "Gagal memperbarui data nasabah.")),
              });
            }}
          />
        )}
      </main>
    </>
  );
}
