"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "../actions";
import { useOnboardingStore } from "../store";

const RESTART_NOTICE =
  "We couldn't find your saved application, so we've started a new one.";

/**
 * Runs a step's server action and handles the failures every step shares:
 * a lost application restarts the wizard, a submitted one jumps to the
 * confirmation page, field errors go to the form, everything else is shown
 * as a banner.
 */
export function useStepAction() {
  const router = useRouter();
  const restart = useOnboardingStore((state) => state.restart);
  const markSubmitted = useOnboardingStore((state) => state.markSubmitted);
  const businessName = useOnboardingStore(
    (state) => state.answers.account?.dba ?? "",
  );
  const [error, setError] = useState<string>();

  async function run<T>({
    action,
    onFieldError,
  }: {
    action: () => Promise<ActionResult<T>>;
    onFieldError?: (args: { field: string; message: string }) => void;
  }): Promise<ActionResult<T>> {
    setError(undefined);
    const result = await action();
    if (result.ok) return result;

    if (result.code === "NO_APPLICATION" || result.code === "NOT_FOUND") {
      restart(RESTART_NOTICE);
      return result;
    }
    if (result.code === "ALREADY_SUBMITTED") {
      markSubmitted({ businessName });
      router.push("/onboarding/submitted");
      return result;
    }
    if (result.field && onFieldError) {
      onFieldError({ field: result.field, message: result.message });
      return result;
    }
    setError(result.message);
    return result;
  }

  return { run, error };
}
