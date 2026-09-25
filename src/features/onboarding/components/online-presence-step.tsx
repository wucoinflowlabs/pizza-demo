"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveOnlinePresence } from "../actions";
import {
  MAX_WEBSITE_URLS,
  onlinePresenceSchema,
  type OnlinePresenceValues,
} from "../schema";
import { useOnboardingStore } from "../store";
import { StepForm } from "./step-form";
import { useStepAction } from "./use-step-action";

const DEFAULT_VALUES: OnlinePresenceValues = {
  websiteUrls: [{ value: "" }],
  privacyPolicyUrl: "",
  termsOfServiceUrl: "",
  returnPolicyUrl: "",
};

const POLICY_FIELDS = [
  {
    name: "privacyPolicyUrl",
    label: "Privacy policy",
    placeholder: "yourpizzeria.com/privacy",
  },
  {
    name: "termsOfServiceUrl",
    label: "Terms of service",
    placeholder: "yourpizzeria.com/terms",
  },
  {
    name: "returnPolicyUrl",
    label: "Refund or return policy (optional)",
    placeholder: "yourpizzeria.com/refunds",
  },
] as const;

export function OnlinePresenceStep() {
  const saved = useOnboardingStore((state) => state.answers.onlinePresence);
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const back = useOnboardingStore((state) => state.back);
  const { run, error } = useStepAction();

  const form = useForm<OnlinePresenceValues>({
    resolver: zodResolver(onlinePresenceSchema),
    defaultValues: saved ?? DEFAULT_VALUES,
  });
  const websites = useFieldArray({ control: form.control, name: "websiteUrls" });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await run({ action: () => saveOnlinePresence(values) });
    if (result.ok) completeStep({ step: "onlinePresence", values });
  });

  return (
    <StepForm
      title="Where do you do business online?"
      description="Card networks require a website and the policies you show customers."
      error={error}
      isSubmitting={form.formState.isSubmitting}
      onBack={back}
      onSubmit={onSubmit}
    >
      <FieldSet>
        <FieldLegend>Websites</FieldLegend>
        <FieldDescription>
          Your website, online ordering page or storefront. Add up to{" "}
          {MAX_WEBSITE_URLS}.
        </FieldDescription>
        <FieldGroup className="gap-3">
          {websites.fields.map((website, index) => (
            <Controller
              key={website.id}
              name={`websiteUrls.${index}.value`}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`website-${index}`} className="sr-only">
                    Website {index + 1}
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      id={`website-${index}`}
                      inputMode="url"
                      autoComplete="url"
                      placeholder="yourpizzeria.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {websites.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove website ${index + 1}`}
                        onClick={() => websites.remove(index)}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ))}
          {websites.fields.length < MAX_WEBSITE_URLS && (
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => websites.append({ value: "" })}
            >
              <PlusIcon data-icon="inline-start" />
              Add another website
            </Button>
          )}
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Policies</FieldLegend>
        <FieldGroup>
          {POLICY_FIELDS.map((policy) => (
            <Controller
              key={policy.name}
              name={policy.name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={policy.name}>{policy.label}</FieldLabel>
                  <Input
                    {...field}
                    id={policy.name}
                    inputMode="url"
                    placeholder={policy.placeholder}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ))}
        </FieldGroup>
      </FieldSet>
    </StepForm>
  );
}
