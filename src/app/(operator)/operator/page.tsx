import type { Metadata } from "next";
import Link from "next/link";
import { LogOutIcon, PlusIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { listApplications, signOutOperator } from "@/features/operator/actions";
import { ApplicationsTable } from "@/features/operator/components/applications-table";
import { OperatorSignIn } from "@/features/operator/components/operator-sign-in";
import { SettlementSweep } from "@/features/operator/components/settlement-sweep";
import { isOperator } from "@/lib/session";

export const metadata: Metadata = { title: "Businesses" };

export default async function OperatorPage() {
  if (!(await isOperator())) return <OperatorSignIn />;

  const applications = await listApplications();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Businesses</h1>
          <p className="text-sm text-muted-foreground">
            Every business onboarding to accept payments with Adora.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={signOutOperator}>
            <Button type="submit" variant="ghost">
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </form>
          <Link href="/operator/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            Onboard a business
          </Link>
        </div>
      </div>
      <ApplicationsTable applications={applications} />
      <SettlementSweep
        pending={applications.filter((application) => application.payouts === "missing").length}
      />
    </div>
  );
}
