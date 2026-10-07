"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2Icon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { markKybCompletedAction } from "@/features/dashboard/kyb-complete-action";
import { OwnerVerificationStep } from "./owner-verification-step";
import { PersonaInquiry } from "./persona-inquiry";
import { StepHeader } from "./step-header";

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 15;

type RefreshResult =
  | { ok: true; progress: SubmerchantProgress }
  | { ok: false; message: string };

function businessVerified(status: string) {
  return status === "approved" || status === "partialApproval";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function BusinessVerificationStep({
  progress,
  refresh,
  onProgress,
  onComplete,
}: {
  progress: SubmerchantProgress;
  refresh: () => Promise<RefreshResult>;
  onProgress: (progress: SubmerchantProgress) => void;
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const [finished, setFinished] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const approved = progress.verificationStatus === "approved";
  const verified = businessVerified(progress.verificationStatus);
  const inquiry = progress.businessInquiry;
  const hasInquiry = Boolean(inquiry?.inquiryId || inquiry?.link);
  // Coinflow sandbox can say "approved" before anyone opens Persona. The
  // inquiry still has to run once in this session.
  const showPersona = hasInquiry && !finished;

  const rememberFinished = () => {
    setFinished(true);
    try {
      sessionStorage.setItem(`za-kyb-done:${progress.merchantId}`, "1");
    } catch {
      // Private browsing can reject storage; this visit still advances.
    }
    void markKybCompletedAction();
  };

  useEffect(() => {
    try {
      if (sessionStorage.getItem(`za-kyb-done:${progress.merchantId}`) === "1") setFinished(true);
    } catch {
      // Ignore storage failures.
    }
  }, [progress.merchantId]);

  const opened = useRef(false);
  useEffect(() => {
    if (!showPersona || opened.current) return;
    opened.current = true;
    setOpen(true);
  }, [showPersona]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const waitForVerificationChange = async () => {
    const before = progressRef.current;
    setChecking(true);
    setError(undefined);
    try {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const result = await refresh();
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onProgress(result.progress);
        if (
          result.progress.verificationStatus !== before.verificationStatus ||
          result.progress.ownerInquiries.length !== before.ownerInquiries.length
        )
          return result.progress;
        await sleep(POLL_INTERVAL_MS);
      }
    } finally {
      setChecking(false);
    }
  };

  const finish = () => {
    setOpen(false);
    // Covers the sandbox-preapproved case where Persona never fires onComplete
    // but the user clicked Continue past the "Business verified" card.
    void markKybCompletedAction();
    onComplete();
  };

  const popup =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="kyb-popup-title"
              className="my-4 flex max-h-[calc(100%-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-primary">Business verification</p>
                  <h2 id="kyb-popup-title" className="font-heading text-xl font-bold">
                    {showPersona
                      ? "Verify your business"
                      : approved
                        ? "Verification complete"
                        : "Verify your business owners"}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close verification"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                {showPersona ? (
                  inquiry?.inquiryId ? (
                    <PersonaInquiry
                      key={inquiry.inquiryId}
                      inquiryId={inquiry.inquiryId}
                      sessionToken={inquiry.sessionToken}
                      onComplete={() => {
                        rememberFinished();
                        void waitForVerificationChange();
                      }}
                    />
                  ) : (
                    <iframe
                      title="Business verification"
                      src={inquiry?.link}
                      className="h-[650px] w-full rounded-xl border"
                      allow="camera; microphone; fullscreen; clipboard-write"
                    />
                  )
                ) : !verified ? (
                  checking ? (
                    <Card>
                      <CardContent className="flex items-center gap-3 text-sm">
                        <Loader2Icon className="size-5 animate-spin text-primary" />
                        Checking your verification…
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
                        Your verification is being prepared. Check again in a moment.
                        <Button variant="outline" size="sm" onClick={() => void waitForVerificationChange()}>
                          Check again
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : !approved ? (
                  <OwnerVerificationStep
                    embedded
                    progress={progress}
                    checking={checking}
                    onInquiryComplete={() => {
                      void waitForVerificationChange();
                    }}
                    onRefresh={() => {
                      void waitForVerificationChange();
                    }}
                    onContinue={finish}
                  />
                ) : (
                  <Card>
                    <CardContent className="flex items-start gap-3">
                      <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium">Business verified</span>
                        <span className="text-muted-foreground">
                          Your business and owners are verified.
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {!showPersona && approved && (
                  <Button size="lg" className="self-end" onClick={finish}>
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 2 · Business verification"
        title="Verify your business"
        description="Provide information about your business such as incorporation documents and Tax ID Numbers."
      />
      {showPersona ? (
        <p className="text-sm text-muted-foreground">
          This opens a secure identity check. Have your incorporation documents and tax ID ready.
        </p>
      ) : approved ? (
        <Card>
          <CardContent className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">Business verified</span>
              <span className="text-muted-foreground">Your business and owners are verified.</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          {verified
            ? "The business is verified. Each owner still needs to confirm their identity."
            : "This opens a secure identity check. Have your incorporation documents and tax ID ready."}
        </p>
      )}
      <Button
        size="lg"
        className="self-start"
        onClick={() => (showPersona || !approved ? setOpen(true) : finish())}
      >
        {showPersona ? "Verify business" : approved ? "Continue" : verified ? "Verify owners" : "Verify business"}
      </Button>
      {popup}
    </div>
  );
}
