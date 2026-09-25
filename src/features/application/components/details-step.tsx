"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircleIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { OnboardingFields } from "@/components/onboarding-form/onboarding-fields";
import type { UploadFile } from "@/components/onboarding-form/field-control";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import {
  FIELD_DEFINITIONS,
  validateForm,
  withoutKey,
  type FieldErrors,
  type FieldValue,
  type FormValues,
} from "@/lib/onboarding-form";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { saveDetailsDraft, submitDetails } from "../actions";
import { StepHeader } from "./step-header";

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1000;

const uploadFile: UploadFile = async ({ field, file }) => {
  const body = new FormData();
  body.set("file", file);
  body.set("field", field.name);
  const response = await fetch("/api/uploads", { method: "POST", body });
  const result = (await response.json().catch(() => ({}))) as { value?: string; error?: string };
  if (!response.ok || !result.value) throw new Error(result.error ?? "Upload failed. Please try again.");
  return result.value;
};

function scrollToField(name: string) {
  document
    .getElementById(`onboarding-field-${name}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        Saved <CheckIcon className="size-3 text-primary" />
      </span>
    );
  if (state === "error") return <span className="text-xs text-destructive">Error saving</span>;
  return null;
}

export function DetailsStep({
  initialValues,
  alreadySubmitted,
  locked,
  onSubmitted,
}: {
  initialValues: FormValues;
  alreadySubmitted: boolean;
  /** Once the application is under review the provider rejects any further edits. */
  locked: boolean;
  onSubmitted: (progress: SubmerchantProgress) => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const initial = useRef(initialValues);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(async () => {
      setSaveState("saving");
      const result = await saveDetailsDraft(values);
      setSaveState(result.ok ? "saved" : "error");
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [values, dirty]);

  const onChange = (name: string, value: FieldValue) => {
    setDirty(true);
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => withoutKey(current, name));
  };

  const isPrefilled = (name: string) => {
    const field = FIELD_DEFINITIONS.find((definition) => definition.name === name);
    const start = initial.current[name];
    return (
      field?.audience === "platform" &&
      start !== undefined &&
      JSON.stringify(start) === JSON.stringify(values[name])
    );
  };

  const submit = () => {
    setMessage(undefined);
    const clientErrors = validateForm({ values, requireAll: true });
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage("Please answer the highlighted questions.");
      scrollToField(FIELD_DEFINITIONS.find((field) => clientErrors[field.name])!.name);
      return;
    }
    startSubmit(async () => {
      const result = await submitDetails(values);
      if (result.ok) {
        setDirty(false);
        onSubmitted(result.progress);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      const first = FIELD_DEFINITIONS.find((field) => result.fieldErrors?.[field.name]);
      if (first) scrollToField(first.name);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <StepHeader
          eyebrow="Step 4 · Onboarding details"
          title="Onboarding Form"
          description={`Provide information about your business model. ${brand.name} filled in what it already knows — review those answers and complete the rest.`}
        />
        <div className="sticky top-4 pt-1">
          <SaveIndicator state={saveState} />
        </div>
      </div>

      {locked && (
        <Alert>
          <CheckIcon />
          <AlertDescription>
            Your application is under review, so these answers can no longer be changed.
          </AlertDescription>
        </Alert>
      )}

      {alreadySubmitted && !locked && !dirty && (
        <Alert>
          <CheckIcon />
          <AlertDescription>
            Your details are submitted. If you change anything, submit again.
          </AlertDescription>
        </Alert>
      )}

      <OnboardingFields
        fields={FIELD_DEFINITIONS}
        values={values}
        errors={errors}
        onChange={onChange}
        disabled={locked}
        prefilledBadge={`Prefilled by ${brand.name}`}
        isPrefilled={isPrefilled}
        uploadFile={uploadFile}
      />

      {message && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {!locked && (
        <Button size="lg" onClick={submit} disabled={submitting}>
          {submitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      )}
    </div>
  );
}
