import type { Metadata } from "next";
import { customerPrefill, findAdoraCustomer } from "@/features/operator/adora-customers";
import { findAdoraStore, shopDemoEmail, storePrefill } from "@/features/operator/adora-stores";
import { NewApplicationForm } from "@/features/operator/components/new-application-form";

export const metadata: Metadata = { title: "Enable payment processing" };

export default async function NewApplicationPage({ searchParams }: PageProps<"/operator/new">) {
  const params = await searchParams;
  const customer = findAdoraCustomer(params.customer);
  const store = customer ? findAdoraStore(customer.id, params.store) : undefined;
  const locationLabel = store ? `${store.street}, ${store.city}` : undefined;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <NewApplicationForm
        key={store ? `${customer?.id}:${store.id}` : customer?.id}
        customerName={
          customer ? (locationLabel ? `${customer.name} — ${locationLabel}` : customer.name) : undefined
        }
        prefill={customer ? (store ? storePrefill(customer, store) : customerPrefill(customer)) : undefined}
        accountEmail={customer && store ? shopDemoEmail(customer.id, store.id) : undefined}
        location={customer && store ? { customerId: customer.id, storeId: store.id } : undefined}
      />
    </div>
  );
}
