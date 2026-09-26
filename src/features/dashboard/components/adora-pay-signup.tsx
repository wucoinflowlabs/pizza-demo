"use client";

import { useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { OnboardingFields } from "@/components/onboarding-form/onboarding-fields";
import { Button } from "@/components/ui/button";
import {
  FIELD_DEFINITIONS,
  withoutKey,
  type FieldErrors,
  type FieldValue,
  type FormValues,
} from "@/lib/onboarding-form";
import { startAdoraPayOnboarding } from "../actions";
import type { AdoraPaySnapshot, PayWebhook } from "../pay-status";
import { AdoraPayActivity } from "./adora-pay-activity";
import { FeatureCarousel } from "./feature-carousel";

export function AdoraPaySignup({ prefill }: { prefill: FormValues }) {
  const [stage, setStage] = useState<"page" | "intro" | "form" | "live">("page");
  const [values, setValues] = useState(prefill);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [live, setLive] = useState<{ snapshot: AdoraPaySnapshot; events: PayWebhook[] }>();
  const [pending, startSubmit] = useTransition();
  const prefilled = new Set(Object.keys(prefill));

  if (live) {
    return (
      <AdoraPayActivity initialSnapshot={live.snapshot} initialEvents={live.events} animate />
    );
  }

  const submit = () => {
    setMessage(undefined);
    startSubmit(async () => {
      const result = await startAdoraPayOnboarding(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      setLive({ snapshot: result.snapshot, events: result.events });
      setStage("live");
    });
  };

  return (
    <div className="relative min-h-[32rem] flex-1">
      <FeatureCarousel />
      {stage === "page" && (
        <div className="absolute top-6 right-6">
          <Button
            type="button"
            size="lg"
            className="bg-white text-adora-navy hover:bg-white/90"
            onClick={() => setStage("intro")}
          >
            Enroll Now
          </Button>
        </div>
      )}
      {stage === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adora-pay-signup-title"
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-semibold text-adora-blue">Adora Pay</p>
              <button
                type="button"
                aria-label="Close sign up"
                onClick={() => setStage("page")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <h1 id="adora-pay-signup-title" className="mt-1 font-heading text-2xl font-bold text-adora-navy">
              Sign up for Adora Pay
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn on card, wallet, and bank payments for{" "}
              {typeof prefill.dba === "string" ? prefill.dba : "this restaurant"}, inside the POS
              the shop already runs.
            </p>
            <Button type="button" className="mt-5 w-full" size="lg" onClick={() => setStage("form")}>
              Start onboarding
            </Button>
          </div>
        </div>
      )}
      {stage === "form" && (
        <div className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adora-pay-form-title"
            className="my-4 flex max-h-[calc(100%-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-adora-blue">Adora Pay</p>
                <h2 id="adora-pay-form-title" className="font-heading text-xl font-bold text-adora-navy">
                  Onboarding form
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close onboarding form"
                onClick={() => setStage("intro")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
              <OnboardingFields
                fields={FIELD_DEFINITIONS}
                values={values}
                errors={errors}
                prefilledBadge="From Adora"
                isPrefilled={(name) => prefilled.has(name)}
                onChange={(name: string, value: FieldValue) => {
                  setValues((current) => ({ ...current, [name]: value }));
                  setErrors((current) => withoutKey(current, name));
                }}
              />
              {message && <p className="text-sm text-destructive">{message}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setStage("intro")}>
                Back
              </Button>
              <Button type="button" onClick={submit} disabled={pending}>
                {pending ? "Submitting…" : "Submit onboarding"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
