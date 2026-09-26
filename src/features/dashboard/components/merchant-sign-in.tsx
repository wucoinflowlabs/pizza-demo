"use client";

import { useActionState, useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
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
  const [passwordVisible, setPasswordVisible] = useState(false);

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
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                defaultValue="11111"
                aria-invalid={!!state?.error}
                className="pr-8"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1 right-1 text-muted-foreground"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
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
