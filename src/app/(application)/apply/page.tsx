import type { Metadata } from "next";
import { MailIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { ApplicationJourney } from "@/features/application/components/application-journey";
import { sanitizeFormValues } from "@/lib/onboarding-form";
import { getOnboardingForm } from "@/lib/payments/onboarding";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getCurrentAccountId } from "@/lib/session";

export const metadata: Metadata = { title: "Your application" };

function NoInvite({ invalid }: { invalid: boolean }) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <MailIcon className="size-6 text-primary" />
        <CardTitle>{invalid ? "This invite link has expired" : "Open your invite link"}</CardTitle>
        <CardDescription>
          {invalid
            ? `Ask your ${brand.name} contact for a new link.`
            : `Your ${brand.name} contact sends you a personal link to start or resume your application.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Questions? Email{" "}
        <a className="underline" href={`mailto:${brand.supportEmail}`}>
          {brand.supportEmail}
        </a>
        .
      </CardContent>
    </Card>
  );
}

export default async function ApplyPage({ searchParams }: PageProps<"/apply">) {
  const accountId = await getCurrentAccountId();
  const { invite } = await searchParams;
  if (!accountId) return <NoInvite invalid={invite === "invalid"} />;

  const [progress, form] = await Promise.all([
    getSubmerchantProgress(accountId),
    getOnboardingForm(accountId),
  ]);

  return <ApplicationJourney initialProgress={progress} initialValues={sanitizeFormValues(form)} />;
}
