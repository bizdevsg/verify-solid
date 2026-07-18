"use client";

import { useRouter } from "next/navigation";
import { TopNavbar } from "@/components/TopNavbar";
import { CustomerForm } from "@/components/CustomerForm";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { getApiErrorMessage } from "@/lib/api";
import { useState } from "react";

export default function CreateCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <TopNavbar title="Buat Nasabah" />
      <main className="flex-1 space-y-4 p-4 md:max-w-2xl md:p-6">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <CustomerForm
          isSubmitting={createCustomer.isPending}
          submitLabel="Simpan Nasabah"
          onSubmit={(values) => {
            setError(null);
            createCustomer.mutate(values, {
              onSuccess: (customer) => router.push(`/customers/${customer.uuid}`),
              onError: (err) => setError(getApiErrorMessage(err, "Gagal menyimpan data nasabah.")),
            });
          }}
        />
      </main>
    </>
  );
}
