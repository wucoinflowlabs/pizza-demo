"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sweepSettlements } from "../actions";

/** Runs the payout-setup sweep once per visit and refreshes the table if anything changed. */
export function SettlementSweep({ pending }: { pending: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    sweepSettlements()
      .then(({ configured, failed }) => {
        if (cancelled) return;
        if (configured.length)
          toast.success(
            `Payouts set up for ${configured.length} approved ${configured.length === 1 ? "business" : "businesses"}`,
          );
        if (failed.length) toast.error(`Couldn't set up payouts for ${failed.join(", ")}`);
        if (configured.length || failed.length) router.refresh();
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't check payout setup. Reload to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [pending, router]);

  return null;
}
