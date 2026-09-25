"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveContact } from "../actions";
import { contactSchema, type ContactValues } from "../schema";
import { useOnboardingStore } from "../store";
import { StepForm } from "./step-form";
import { useStepAction } from "./use-step-action";

export function ContactStep() {
  const saved = useOnboardingStore((state) => state.answers.contact);
  const accountEmail = useOnboardingStore(
    (state) => state.answers.account?.email ?? "",
  );
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const back = useOnboardingStore((state) => state.back);
  const { run, error } = useStepAction();

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: saved ?? {
      businessEmail: accountEmail,
      businessPhoneCountryCode: "+1",
      businessPhoneNumber: "",
      billingEmailSameAsBusinessEmail: true,
      billingEmail: "",
    },
  });
  const billingSame = useWatch({
    control: form.control,
    name: "billingEmailSameAsBusinessEmail",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run({ action: () => saveContact(values) });
    if (result.ok) completeStep({ step: "contact", values });
  });

  return (
    <StepForm
      title="How can customers reach you?"
      description="We'll use these for receipts, support and important account updates."
      error={error}
      isSubmitting={form.formState.isSubmitting}
      onBack={back}
      onSubmit={onSubmit}
    >
      <FieldGroup>
        <Controller
          name="businessEmail"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="businessEmail">Business email</FieldLabel>
              <Input
                {...field}
                id="businessEmail"
                type="email"
                autoComplete="email"
                placeholder="hello@yourpizzeria.com"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <Controller
            name="businessPhoneCountryCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="businessPhoneCountryCode">Code</FieldLabel>
                <Input
                  {...field}
                  id="businessPhoneCountryCode"
                  inputMode="tel"
                  autoComplete="tel-country-code"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="businessPhoneNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="businessPhoneNumber">
                  Business phone
                </FieldLabel>
                <Input
                  {...field}
                  id="businessPhoneNumber"
                  type="tel"
                  autoComplete="tel-national"
                  placeholder="(312) 555-0142"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <Controller
          name="billingEmailSameAsBusinessEmail"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="billingEmailSameAsBusinessEmail"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
              />
              <FieldLabel
                htmlFor="billingEmailSameAsBusinessEmail"
                className="font-normal"
              >
                Send invoices and billing notices to my business email
              </FieldLabel>
            </Field>
          )}
        />
        {!billingSame && (
          <Controller
            name="billingEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="billingEmail">Billing email</FieldLabel>
                <Input
                  {...field}
                  id="billingEmail"
                  type="email"
                  placeholder="billing@yourpizzeria.com"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}
      </FieldGroup>
    </StepForm>
  );
}
