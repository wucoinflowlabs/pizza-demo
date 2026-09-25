"use client";

import { useTransition } from "react";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInviteUrl } from "../actions";

export function InviteActions({ merchantId }: { merchantId: string }) {
  const [pending, startTransition] = useTransition();

  const withInvite = (handle: (url: string) => void) =>
    startTransition(async () => {
      try {
        handle(await getInviteUrl(merchantId));
      } catch {
        toast.error("Couldn't create an invite link. Please try again.");
      }
    });

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          withInvite(async (url) => {
            await navigator.clipboard.writeText(url);
            toast.success("Invite link copied");
          })
        }
      >
        <CopyIcon data-icon="inline-start" />
        Copy invite
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Open as the business"
        disabled={pending}
        onClick={() => withInvite((url) => window.open(url, "_blank", "noopener"))}
      >
        <ExternalLinkIcon />
      </Button>
    </div>
  );
}
