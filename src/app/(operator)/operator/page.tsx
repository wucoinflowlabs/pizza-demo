import type { Metadata } from "next";
import { listApplications } from "@/features/operator/actions";
import { ADORA_CUSTOMERS } from "@/features/operator/adora-customers";
import { ADORA_STORES } from "@/features/operator/adora-stores";
import { OperatorConsole } from "@/features/operator/components/operator-console";
import { SettlementSweep } from "@/features/operator/components/settlement-sweep";
import { applicationMatchesStore } from "@/features/operator/store-account";
import { storeOnboardingLabel, storeOnboardingStatus } from "@/features/operator/store-status";

export const metadata: Metadata = { title: "Adora customers" };

export default async function OperatorPage() {
  const listed = await listApplications();
  const applications = listed.map((application) => {
    const store = ADORA_STORES.find((item) =>
      applicationMatchesStore(application.merchantId, item.customerId, item.id),
    );
    const customer = store
      ? ADORA_CUSTOMERS.find((item) => item.id === store.customerId)
      : undefined;
    return {
      ...application,
      store: store
        ? {
            name: customer?.name ?? store.customerId,
            street: store.street,
            city: store.city,
            state: store.state,
            phone: store.phone,
          }
        : undefined,
    };
  });
  const stores = ADORA_STORES.map((store) => {
    const application = listed.find((item) =>
      applicationMatchesStore(item.merchantId, store.customerId, store.id),
    );
    const status = storeOnboardingStatus(application);
    return { ...store, status, label: storeOnboardingLabel(status) };
  });

  return (
    <>
      <OperatorConsole
        customers={ADORA_CUSTOMERS}
        stores={stores}
        applications={applications}
      />
      <SettlementSweep
        pending={listed.filter((application) => application.payouts === "missing").length}
      />
    </>
  );
}
