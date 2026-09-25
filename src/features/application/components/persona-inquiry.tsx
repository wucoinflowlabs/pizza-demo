"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// The Persona SDK touches browser globals at import time, so it can't render on the server.
const Inquiry = dynamic(() => import("persona-react"), { ssr: false });

export function PersonaInquiry({
  inquiryId,
  sessionToken,
  onComplete,
}: {
  inquiryId: string;
  sessionToken?: string;
  onComplete: () => void;
}) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative min-h-[650px] w-full [&_iframe]:h-[650px] [&_iframe]:w-full [&_iframe]:rounded-xl [&_iframe]:border">
      {!ready && <Skeleton className="absolute inset-0 h-[650px] rounded-xl" />}
      <Inquiry
        inquiryId={inquiryId}
        sessionToken={sessionToken}
        frameHeight="650px"
        frameWidth="100%"
        onReady={() => setReady(true)}
        onComplete={onComplete}
        onError={(error) => console.error("Verification error", error)}
      />
    </div>
  );
}
