import { Badge } from "@/components/ui/badge";

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

export function FormBadge({ submitted }: { submitted: boolean }) {
  return (
    <Badge variant={submitted ? "default" : "outline"}>
      {submitted ? "Details complete" : "Details in progress"}
    </Badge>
  );
}
