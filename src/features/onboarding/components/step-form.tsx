"use client";

import type { FormEventHandler, ReactNode } from "react";
import { AlertCircleIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StepForm({
  title,
  description,
  error,
  isSubmitting,
  submitLabel = "Continue",
  onBack,
  onSubmit,
  children,
}: {
  title: string;
  description?: string;
  error?: string;
  isSubmitting: boolean;
  submitLabel?: string;
  onBack?: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {children}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onBack}
              disabled={isSubmitting}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            )}
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
