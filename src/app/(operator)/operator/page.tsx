import type { Metadata } from "next";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listApplications, signOutOperator } from "@/features/operator/actions";
import { ADORA_CUSTOMERS } from "@/features/operator/adora-customers";
import { ApplicationsTable } from "@/features/operator/components/applications-table";
import { CustomersTable } from "@/features/operator/components/customers-table";
import { OperatorSignIn } from "@/features/operator/components/operator-sign-in";
import { SettlementSweep } from "@/features/operator/components/settlement-sweep";
import { isOperator } from "@/lib/session";

export const metadata: Metadata = { title: "Adora customers" };

export default async function OperatorPage() {
  if (!(await isOperator())) return <OperatorSignIn />;

  const applications = await listApplications();
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Adora customers</h1>
            <p className="text-sm text-muted-foreground">
              Restaurants running on Adora. Enable payment processing to move them onto Adora
              Payments.
            </p>
          </div>
          <form action={signOutOperator}>
            <Button type="submit" variant="ghost">
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </form>
        </div>
        <CustomersTable customers={ADORA_CUSTOMERS} />
      </section>
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Payments applications
          </h2>
          <p className="text-sm text-muted-foreground">
            Customers onboarding to Adora Payments, powered by Coinflow.
          </p>
        </div>
        <ApplicationsTable applications={applications} />
        <SettlementSweep
          pending={applications.filter((application) => application.payouts === "missing").length}
        />
      </section>
    </div>
  );
}
