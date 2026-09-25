"use client";

import { useActionState } from "react";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInOperator } from "../actions";

export function OperatorSignIn() {
  const [state, formAction, pending] = useActionState(signInOperator, undefined);

  return (
    <form action={formAction} className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <LockIcon className="size-5 text-primary" />
          <CardTitle>Adora team sign in</CardTitle>
          <CardDescription>Internal tools for onboarding new businesses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!state?.error}>
            <FieldLabel htmlFor="passcode">Passcode</FieldLabel>
            <Input
              id="passcode"
              name="passcode"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!state?.error}
              required
            />
            <FieldError>{state?.error}</FieldError>
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            Sign in
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
