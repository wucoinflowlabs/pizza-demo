import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { findAdoraCustomer } from "@/features/operator/adora-customers";
import { NewApplicationForm } from "@/features/operator/components/new-application-form";
import { isOperator } from "@/lib/session";

export const metadata: Metadata = { title: "Enable payment processing" };

export default async function NewApplicationPage({ searchParams }: PageProps<"/operator/new">) {
  if (!(await isOperator())) redirect("/operator");
  const customer = findAdoraCustomer((await searchParams).customer);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <NewApplicationForm
        key={customer?.id}
        customerName={customer?.name}
        prefill={customer?.prefill}
      />
    </div>
  );
}
