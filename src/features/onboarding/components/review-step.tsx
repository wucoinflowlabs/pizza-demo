"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { submitApplication } from "../actions";
import {
  INDUSTRY_OPTIONS,
  JURISDICTION_OPTIONS,
  PAYIN_METHOD_OPTIONS,
  PAYOUT_METHOD_OPTIONS,
  labelFor,
  type Option,
} from "../options";
import { useOnboardingStore, type StepId } from "../store";
import { StepForm } from "./step-form";
import { useStepAction } from "./use-step-action";

function labelsFor({
  options,
  values,
}: {
  options: readonly Option[];
  values: readonly string[];
}): string {
  return values.map((value) => labelFor({ options, value })).join(", ");
}

function Section({
  title,
  stepId,
  rows,
}: {
  title: string;
  stepId: StepId;
  rows: { label: string; value: ReactNode }[];
}) {
  const goToStep = useOnboardingStore((state) => state.goToStep);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => goToStep(stepId)}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="break-words">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReviewStep() {
  const router = useRouter();
  const answers = useOnboardingStore((state) => state.answers);
  const back = useOnboardingStore((state) => state.back);
  const markSubmitted = useOnboardingStore((state) => state.markSubmitted);
  const { run, error } = useStepAction();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { account, contact, onlinePresence, payments } = answers;
  if (!account || !contact || !onlinePresence || !payments) return null;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await run({ action: () => submitApplication(answers) });
    if (!result.ok) {
      setIsSubmitting(false);
      return;
    }
    markSubmitted({
      businessName: account.dba,
      referenceId: result.data.referenceId,
    });
    router.push("/onboarding/submitted");
  };

  return (
    <StepForm
      title="Review your application"
      description="Make sure everything looks right before you submit."
      error={error}
      isSubmitting={isSubmitting}
      submitLabel="Submit application"
      onBack={back}
      onSubmit={onSubmit}
    >
      <Section
        title="Your business"
        stepId="account"
        rows={[
          { label: "Email", value: account.email },
          { label: "Business name", value: account.dba },
          {
            label: "Industry",
            value: labelFor({ options: INDUSTRY_OPTIONS, value: account.industry }),
          },
        ]}
      />
      <Separator />
      <Section
        title="Contact details"
        stepId="contact"
        rows={[
          { label: "Business email", value: contact.businessEmail },
          {
            label: "Business phone",
            value: `${contact.businessPhoneCountryCode} ${contact.businessPhoneNumber}`,
          },
          {
            label: "Billing email",
            value: contact.billingEmailSameAsBusinessEmail
              ? contact.businessEmail
              : contact.billingEmail,
          },
        ]}
      />
      <Separator />
      <Section
        title="Online presence"
        stepId="onlinePresence"
        rows={[
          {
            label: "Websites",
            value: onlinePresence.websiteUrls
              .map(({ value }) => value)
              .join(", "),
          },
          { label: "Privacy policy", value: onlinePresence.privacyPolicyUrl },
          { label: "Terms of service", value: onlinePresence.termsOfServiceUrl },
          { label: "Refund policy", value: onlinePresence.returnPolicyUrl },
        ]}
      />
      <Separator />
      <Section
        title="Payments"
        stepId="payments"
        rows={[
          {
            label: "Customers pay with",
            value: labelsFor({
              options: PAYIN_METHOD_OPTIONS,
              values: payments.payinMethods,
            }),
          },
          {
            label: "You get paid by",
            value: labelsFor({
              options: PAYOUT_METHOD_OPTIONS,
              values: payments.payoutMethods,
            }),
          },
          {
            label: "Customer regions",
            value: labelsFor({
              options: JURISDICTION_OPTIONS,
              values: payments.endUserJurisdictions,
            }),
          },
        ]}
      />
    </StepForm>
  );
}
