"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { ArrowLeftIcon, FileTextIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import type { Chargeback } from "../chargebacks";
import { MAX_EVIDENCE_MB, isBlankHtml } from "../evidence";
import { respondToChargebackAction, saveChargebackDraftAction } from "../payment-actions";
import { ChargebackStatusPill, CopyableId } from "./payment-pills";
import { RichTextEditor } from "./rich-text-editor";

type Mode = "manual" | "pdf";

const ACTION =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** "10/19/26" in the shop's time zone. */
function shortDate(value: string | undefined, timeZone: string) {
  const at = value ? new Date(value) : undefined;
  if (!at || Number.isNaN(at.getTime())) return undefined;
  return at.toLocaleDateString("en-US", { timeZone, month: "2-digit", day: "2-digit", year: "2-digit" });
}

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Why a file can't be used as evidence, or undefined when it can. */
function fileProblem(file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return `${file.name} isn't a PDF.`;
  if (file.size > MAX_EVIDENCE_MB * 1024 * 1024) return `${file.name} is larger than ${MAX_EVIDENCE_MB}MB.`;
  return undefined;
}

function PdfDrop({
  file,
  onFile,
  disabled,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (next: File | undefined) => {
    if (!next) return;
    const problem = fileProblem(next);
    if (problem) toast.error(problem);
    else onFile(next);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl p-8 ring-1 ring-foreground/10">
        <div className="flex w-full max-w-md items-center gap-3 rounded-xl bg-muted/60 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <FileTextIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{fileSize(file.size)}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFile(null)}
            aria-label="Remove PDF"
            className="rounded-md p-2 text-foreground/70 transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">This PDF is sent as your evidence when you submit.</p>
      </div>
    );
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-shop-accent bg-shop-accent/5" : "border-foreground/15 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground/70">
        <UploadIcon className="size-5" />
      </span>
      <span className="font-medium text-foreground">Drop a PDF here, or click to choose one</span>
      <span className="max-w-sm text-xs text-muted-foreground">
        One PDF up to {MAX_EVIDENCE_MB}MB, e.g. receipts, delivery confirmation, order history and customer messages.
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </label>
  );
}

export function DisputeResponse({
  chargeback,
  initialDraft,
  timeZone,
  backHref,
}: {
  chargeback: Chargeback;
  /** The saved draft, as HTML. */
  initialDraft: string;
  timeZone: string;
  backHref: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [html, setHtml] = useState(initialDraft);
  const [file, setFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const busy = saving || submitting;
  const location = chargeback.location?.id;
  const ready = mode === "manual" ? !isBlankHtml(html) : file !== null;
  const expires = shortDate(chargeback.respondBy, timeZone);

  const saveDraft = () =>
    startSaving(async () => {
      const result = await saveChargebackDraftAction({ paymentId: chargeback.id, location, draft: html });
      if (result.ok) toast.success("Draft saved.");
      else toast.error(result.error);
    });

  const submit = () =>
    startSubmitting(async () => {
      let evidence: { response: string } | { fileKey: string } = { response: html };
      if (mode === "pdf" && file) {
        const body = new FormData();
        body.set("file", file);
        if (location) body.set("location", location);
        const response = await fetch("/api/chargebacks/evidence", { method: "POST", body }).catch(() => undefined);
        const uploaded = (await response?.json().catch(() => undefined)) as
          | { fileKey?: string; error?: string }
          | undefined;
        if (!response?.ok || !uploaded?.fileKey) {
          toast.error(uploaded?.error ?? "The PDF couldn't be uploaded. Please try again.");
          return;
        }
        evidence = { fileKey: uploaded.fileKey };
      }

      const result = await respondToChargebackAction({ paymentId: chargeback.id, location, ...evidence });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      toast.success("Response submitted. It's on its way to the card network.");
      router.push(backHref);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to chargebacks
      </Link>

      <div className="flex flex-col gap-5 rounded-2xl bg-background p-5 shadow-sm ring-1 ring-foreground/10 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-semibold text-shop-ink">Dispute chargeback</h1>
            {expires && <p className="mt-0.5 text-sm text-muted-foreground">Expires on {expires}</p>}
          </div>
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Amount</dt>
              <dd className="font-heading text-lg font-semibold text-shop-ink">
                {money(chargeback.totalCents, chargeback.currency)}
              </dd>
              <ChargebackStatusPill status={chargeback.status} />
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <dt>Payment</dt>
              <dd className="text-foreground/80">
                <CopyableId value={chargeback.id} label="payment ID" />
              </dd>
            </div>
            {chargeback.reasonCode && (
              <div className="flex items-center gap-1.5 text-muted-foreground" title={chargeback.reasonDescription}>
                <dt>Reason</dt>
                <dd className="text-foreground/80">{chargeback.reasonCode}</dd>
              </div>
            )}
            {chargeback.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <dt>Location</dt>
                <dd className="text-foreground/80">{chargeback.location.label}</dd>
              </div>
            )}
          </dl>
        </header>

        <div role="tablist" aria-label="Response type" className="grid grid-cols-2 gap-1 rounded-xl p-1 ring-1 ring-foreground/10">
          {(
            [
              { value: "manual", label: "Manual input" },
              { value: "pdf", label: "PDF upload" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              disabled={busy}
              onClick={() => setMode(option.value)}
              className={cn(
                "h-11 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none",
                mode === option.value
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex h-[32rem] flex-col">
          {mode === "manual" ? (
            <RichTextEditor
              // Seeds from the latest text, so switching to PDF and back keeps what was typed.
              initialHtml={html}
              onChange={setHtml}
              placeholder="Type your response"
              disabled={busy}
              className="flex-1"
            />
          ) : (
            <PdfDrop file={file} onFile={setFile} disabled={busy} />
          )}
        </div>
        {mode === "manual" && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Explain why the charge is valid: what was ordered, when it was delivered or picked up, and any contact with
            the customer.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={saveDraft}
            disabled={busy || mode !== "manual"}
            title={mode === "manual" ? undefined : "Drafts save written responses only"}
            className={cn(ACTION, "bg-muted text-foreground hover:bg-foreground/10")}
          >
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            Save draft
          </button>

          <AlertDialog.Root open={confirmOpen} onOpenChange={(next) => !submitting && setConfirmOpen(next)}>
            <AlertDialog.Trigger
              disabled={busy || !ready}
              className={cn(ACTION, "bg-shop-fill text-shop-on-fill hover:bg-shop-fill/90")}
            >
              Submit response
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-shop-ink/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
              <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-background p-5 text-sm shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                <div>
                  <AlertDialog.Title className="font-heading text-lg font-semibold text-shop-ink">
                    Submit this response?
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-1 text-muted-foreground">
                    {mode === "pdf" && file ? `${file.name} is` : "Your written response is"} sent to the card network
                    as evidence for this dispute. You can&apos;t change it afterwards.
                  </AlertDialog.Description>
                </div>
                <div className="flex justify-end gap-2">
                  <AlertDialog.Close render={<Button type="button" variant="outline" disabled={submitting} />}>
                    Cancel
                  </AlertDialog.Close>
                  <Button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="gap-2 bg-shop-fill text-shop-on-fill hover:bg-shop-fill/90"
                  >
                    {submitting && <Loader2Icon className="animate-spin" />}
                    Submit response
                  </Button>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </div>
      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
