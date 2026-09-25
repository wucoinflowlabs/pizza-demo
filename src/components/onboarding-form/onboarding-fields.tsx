"use client";

import { InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  groupIntoSections,
  isFieldVisible,
  type FieldDefinition,
  type FieldErrors,
  type FieldValue,
  type FormValues,
} from "@/lib/onboarding-form";
import { FieldControl, type UploadFile } from "./field-control";

export function OnboardingFields({
  fields,
  values,
  errors,
  onChange,
  disabled,
  prefilledBadge,
  isPrefilled,
  uploadFile,
}: {
  fields: readonly FieldDefinition[];
  values: FormValues;
  errors: FieldErrors;
  onChange: (name: string, value: FieldValue) => void;
  disabled?: boolean;
  prefilledBadge?: string;
  isPrefilled?: (name: string) => boolean;
  uploadFile?: UploadFile;
}) {
  const sections = groupIntoSections(fields);

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section, index) => {
        const visible = section.fields.filter((field) => isFieldVisible({ field, values }));
        if (!visible.length) return null;
        return (
          <Card key={section.header ?? `section-${index}`}>
            <CardContent className="flex flex-col gap-5">
              {section.header && (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {section.header}
                  </span>
                  <Separator />
                </div>
              )}
              {visible.map((field) => (
                <Field
                  key={field.name}
                  id={`onboarding-field-${field.name}`}
                  data-invalid={!!errors[field.name]}
                >
                  <FieldLabel htmlFor={`field-${field.name}`} className="leading-snug">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </FieldLabel>
                  {field.tip && (
                    <FieldDescription className="flex gap-1.5">
                      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                      {field.tip}
                    </FieldDescription>
                  )}
                  {field.type === "file" && field.placeholder && (
                    <FieldDescription>{field.placeholder}</FieldDescription>
                  )}
                  <FieldControl
                    field={field}
                    values={values}
                    onChange={onChange}
                    invalid={!!errors[field.name]}
                    disabled={disabled}
                    uploadFile={uploadFile}
                  />
                  {prefilledBadge && isPrefilled?.(field.name) && (
                    <Badge variant="secondary" className="self-start">
                      {prefilledBadge}
                    </Badge>
                  )}
                  <FieldError>{errors[field.name]}</FieldError>
                </Field>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
