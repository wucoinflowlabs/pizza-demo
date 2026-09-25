import { Badge } from "@/components/ui/badge";
import type { PayoutStatus } from "@/lib/settlement-setup";

const VERIFICATION_LABELS: Record<string, { label: string; tone: "default" | "secondary" | "outline" | "destructive" }> = {
  approved: { label: "Verified", tone: "default" },
  partialApproval: { label: "Owners pending", tone: "secondary" },
  pending: { label: "Not verified", tone: "outline" },
  rejected: { label: "Rejected", tone: "destructive" },
};

export function VerificationBadge({ status }: { status: string }) {
  const { label, tone } = VERIFICATION_LABELS[status] ?? { label: status, tone: "outline" as const };
  return <Badge variant={tone}>{label}</Badge>;
}

export function ApplicationBadge({
  submitted,
  approved,
}: {
  submitted: boolean;
  approved: boolean;
}) {
  if (approved) return <Badge>Approved</Badge>;
  if (submitted) return <Badge variant="secondary">Under review</Badge>;
  return <Badge variant="outline">Not submitted</Badge>;
}

const PAYOUT_LABELS: Record<
  PayoutStatus,
  { label: string; tone: "default" | "secondary" | "outline" | "destructive" }
> = {
  set: { label: "Adora wallet", tone: "default" },
  missing: { label: "Setting up", tone: "secondary" },
  waiting: { label: "After approval", tone: "outline" },
  conflict: { label: "Other wallet", tone: "destructive" },
  unavailable: { label: "No Adora wallet", tone: "outline" },
};

export function PayoutBadge({ status }: { status: PayoutStatus }) {
  const { label, tone } = PAYOUT_LABELS[status];
  return <Badge variant={tone}>{label}</Badge>;
}

export function FormBadge({ submitted }: { submitted: boolean }) {
  return (
    <Badge variant={submitted ? "default" : "outline"}>
      {submitted ? "Details complete" : "Details in progress"}
    </Badge>
  );
}
