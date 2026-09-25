"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { savePayments } from "../actions";
import {
  JURISDICTION_OPTIONS,
  PAYIN_METHOD_OPTIONS,
  PAYOUT_METHOD_OPTIONS,
} from "../options";
import { paymentsSchema, type PaymentsValues } from "../schema";
import { useOnboardingStore } from "../store";
import { CheckboxCardGroup } from "./checkbox-card-group";
import { StepForm } from "./step-form";
import { useStepAction } from "./use-step-action";

const DEFAULT_VALUES: PaymentsValues = {
  payinMethods: ["card", "applePay", "googlePay"],
  payoutMethods: ["standard"],
  endUserJurisdictions: ["US"],
};

const SECTIONS = [
  {
    name: "payinMethods",
    legend: "How will customers pay you?",
    description: "Pick every method you'd like to offer at checkout.",
    options: PAYIN_METHOD_OPTIONS,
  },
  {
    name: "payoutMethods",
    legend: "How do you want to get paid?",
    description: "Where we send the money you earn.",
    options: PAYOUT_METHOD_OPTIONS,
  },
  {
    name: "endUserJurisdictions",
    legend: "Where are your customers?",
    description: "Select every region you sell to.",
    options: JURISDICTION_OPTIONS,
  },
] as const;

export function PaymentsStep() {
  const saved = useOnboardingStore((state) => state.answers.payments);
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const back = useOnboardingStore((state) => state.back);
  const { run, error } = useStepAction();

  const form = useForm<PaymentsValues>({
    resolver: zodResolver(paymentsSchema),
    defaultValues: saved ?? DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run({ action: () => savePayments(values) });
    if (result.ok) completeStep({ step: "payments", values });
  });

  return (
    <StepForm
      title="Set up payments"
      description="You can change these later."
      error={error}
      isSubmitting={form.formState.isSubmitting}
      onBack={back}
      onSubmit={onSubmit}
    >
      {SECTIONS.map((section, index) => (
        <div key={section.name} className="flex flex-col gap-6">
          {index > 0 && <FieldSeparator />}
          <Controller
            name={section.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid}>
                <FieldLegend>{section.legend}</FieldLegend>
                <FieldDescription>{section.description}</FieldDescription>
                <CheckboxCardGroup
                  name={section.name}
                  options={section.options}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </FieldSet>
            )}
          />
        </div>
      ))}
    </StepForm>
  );
}
