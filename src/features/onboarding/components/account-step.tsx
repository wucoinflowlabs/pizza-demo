"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAccount } from "../actions";
import { INDUSTRY_OPTIONS } from "../options";
import { accountSchema, type AccountValues } from "../schema";
import { useOnboardingStore } from "../store";
import { StepForm } from "./step-form";
import { useStepAction } from "./use-step-action";

const DEFAULT_VALUES: AccountValues = {
  email: "",
  dba: "",
  industry: "foodBeverage",
};

export function AccountStep() {
  const saved = useOnboardingStore((state) => state.answers.account);
  const accountExists = useOnboardingStore((state) => state.accountExists);
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const markAccountCreated = useOnboardingStore(
    (state) => state.markAccountCreated,
  );
  const { run, error } = useStepAction();

  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: saved ?? DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run({
      action: () => saveAccount({ values, accountExists }),
      onFieldError: ({ message }) =>
        form.setError("email", { type: "server", message }),
    });
    if (!result.ok) return;
    markAccountCreated();
    completeStep({ step: "account", values });
  });

  return (
    <StepForm
      title="Tell us about your business"
      description="This creates your account. It takes about five minutes to finish the application."
      error={error}
      isSubmitting={form.formState.isSubmitting}
      onSubmit={onSubmit}
    >
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Your email</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@yourpizzeria.com"
                disabled={accountExists}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                {accountExists
                  ? "Your sign-in email can't be changed once your account is created."
                  : "You'll use this to sign in."}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="dba"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="dba">Business name</FieldLabel>
              <Input
                {...field}
                id="dba"
                autoComplete="organization"
                placeholder="Tony's Brick Oven"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                The name customers know you by.
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="industry"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="industry">Industry</FieldLabel>
              <Select
                items={INDUSTRY_OPTIONS}
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger
                  id="industry"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
    </StepForm>
  );
}
