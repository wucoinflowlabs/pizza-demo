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
import { signInMerchant } from "../actions";

export function MerchantSignIn() {
  const [state, formAction, pending] = useActionState(signInMerchant, undefined);

  return (
    <form action={formAction} className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <LockIcon className="size-5 text-primary" />
          <CardTitle>Merchant login</CardTitle>
          <CardDescription>Sign in to the products Adora runs for your restaurant.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field data-invalid={!!state?.error}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              aria-invalid={!!state?.error}
              required
            />
          </Field>
          <Field data-invalid={!!state?.error}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
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
