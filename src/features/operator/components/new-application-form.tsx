"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { OnboardingFields } from "@/components/onboarding-form/onboarding-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_FIELDS,
  validateForm,
  withoutKey,
  type FieldErrors,
  type FieldValue,
  type FormValues,
} from "@/lib/onboarding-form";
import {
  createApplication,
  generateSampleApplication,
  type CreateApplicationResult,
} from "../actions";

type Created = Extract<CreateApplicationResult, { ok: true }>;

// Demo prefill: every field stays editable.
const PREFILLED_EMAIL = "chris@coinflowlabs.app";
const PREFILLED_VALUES: FormValues = {
  dba: "Giordano's Pizza",
  businessPhoneCountryCode: "+1",
  businessPhoneNumber: "(312) 555-0147",
  businessEmail: "chris@coinflowlabs.app",
  billingEmail: "chris@coinflowlabs.app",
  whatDoesYourBusinessDo: "The best deep dish in chicago",
  websiteUrl: "https://giordanos.com/",
};

function CreatedCard({ created, onReset }: { created: Created; onReset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CheckCircle2Icon className="size-8 text-primary" />
        <CardTitle className="text-xl">Business account created</CardTitle>
        <CardDescription>
          Send this link to the business. They&apos;ll verify their business and owners, then finish the
          few questions only they can answer.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {created.warning && (
          <Alert>
            <AlertCircleIcon />
            <AlertDescription>{created.warning}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Account ID </span>
          <span className="font-mono">{created.merchantId}</span>
        </div>
        <Input readOnly value={created.inviteUrl} className="font-mono text-xs" aria-label="Invite link" />
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(created.inviteUrl);
            toast.success("Invite link copied");
          }}
        >
          <CopyIcon data-icon="inline-start" />
          Copy invite link
        </Button>
        <a
          href={created.inviteUrl}
          target="_blank"
          rel="noopener"
          className={buttonVariants({ variant: "outline" })}
        >
          <ExternalLinkIcon data-icon="inline-start" />
          Open as the business
        </a>
        <Button variant="ghost" onClick={onReset}>
          Onboard another
        </Button>
        <Link href="/operator" className={buttonVariants({ variant: "ghost" })}>
          All customers
        </Link>
      </CardFooter>
    </Card>
  );
}

export function NewApplicationForm({
  customerName,
  prefill = PREFILLED_VALUES,
}: {
  /** The Adora customer being onboarded, when started from their row on /operator. */
  customerName?: string;
  prefill?: FormValues;
}) {
  const [email, setEmail] = useState(PREFILLED_EMAIL);
  const [values, setValues] = useState<FormValues>(prefill);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [created, setCreated] = useState<Created>();
  const [formKey, setFormKey] = useState(0);
  const [submitting, startSubmit] = useTransition();
  const [sampling, startSample] = useTransition();

  const onChange = (name: string, value: FieldValue) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => withoutKey(current, name));
  };

  const fillSample = () =>
    startSample(async () => {
      const sample = await generateSampleApplication();
      setEmail(sample.email);
      setValues(sample.values);
      setErrors({});
      setFormKey((key) => key + 1);
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    const clientErrors = validateForm({ values, fields: PLATFORM_FIELDS, requireAll: false });
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage("Please fix the highlighted fields.");
      return;
    }
    startSubmit(async () => {
      const result = await createApplication({ email, values });
      if (result.ok) {
        setCreated(result);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
    });
  };

  if (created)
    return (
      <CreatedCard
        created={created}
        onReset={() => {
          setCreated(undefined);
          setEmail(PREFILLED_EMAIL);
          setValues(prefill);
          setFormKey((key) => key + 1);
        }}
      />
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Enable payment processing{customerName && ` for ${customerName}`}
          </h1>
        </div>
        <Button type="button" variant="outline" onClick={fillSample} disabled={sampling}>
          {sampling ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          Fill with sample data
        </Button>
      </div>

      <Card>
        <CardContent>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="login-email">
              Account owner email<span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="login-email"
              type="email"
              value={email}
              placeholder="owner@yourbusiness.com"
              aria-invalid={!!errors.email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => withoutKey(current, "email"));
              }}
            />
            <FieldDescription>The business signs in with this. It must not already have an account.</FieldDescription>
            <FieldError>{errors.email}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <OnboardingFields
        key={formKey}
        fields={PLATFORM_FIELDS}
        values={values}
        errors={errors}
        onChange={onChange}
      />

      {message && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end gap-2">
        <Link href="/operator" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
          Create account &amp; invite
        </Button>
      </div>
    </form>
  );
}
