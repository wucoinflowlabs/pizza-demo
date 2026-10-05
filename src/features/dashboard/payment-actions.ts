"use server";

import { z } from "zod";
import {
  acceptChargeback,
  respondToChargeback,
  saveChargebackDraft,
  simulateChargeback,
} from "@/lib/payments/chargebacks";
import { PaymentsError } from "@/lib/payments/errors";
import { refundPayment } from "@/lib/payments/payments";
import { resolvePaymentSubmerchant } from "./session-submerchant";

const RefundInput = z.object({
  paymentId: z.string().min(1),
  reason: z.enum(["userCancellation", "failedFulfillment", "buyerFraud", "other"]),
  partialCents: z.number().int().positive().optional(),
  /** A franchise owner's store id. Ignored for a single-store login. */
  location: z.string().optional(),
});

/** Simulating and accepting a chargeback both name just the payment. */
const ChargebackInput = z.object({
  paymentId: z.string().min(1),
  /** A franchise owner's store id. Ignored for a single-store login. */
  location: z.string().optional(),
});

/** A written response is HTML from the dispute editor. */
const MAX_RESPONSE_CHARS = 200_000;
const ResponseHtml = z.string().max(MAX_RESPONSE_CHARS);

const SaveDraftInput = ChargebackInput.extend({ draft: ResponseHtml });

/** Exactly one of a written response or an uploaded PDF's key. */
const RespondInput = ChargebackInput.extend({
  response: ResponseHtml.optional(),
  fileKey: z.string().min(1).optional(),
});

/** Defence in depth: the editor already sends only an allowlist of tags and attributes. */
function stripActiveContent(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, "");
}

/** The words in a response, without its markup. */
function plainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
}

type ActionResult = { ok: true } | { ok: false; error: string };

/** The provider's own explanation when it's a readable sentence, otherwise `fallback`. */
function errorMessage(err: unknown, fallback: string) {
  if (!(err instanceof PaymentsError)) return fallback;
  const detail = err.message.replace(/^\d{3}:\s*/, "").trim();
  return detail && detail.length <= 200 && !detail.startsWith("{") ? detail : err.userMessage;
}

export async function refundPaymentAction(input: z.input<typeof RefundInput>): Promise<ActionResult> {
  const parsed = RefundInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the refund amount and reason." };

  const { paymentId, reason, partialCents, location } = parsed.data;
  const submerchantId = await resolvePaymentSubmerchant(location);
  if (!submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  try {
    await refundPayment(submerchantId, paymentId, { reason, partialCents });
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] refund failed", err);
    return { ok: false, error: errorMessage(err, "The refund couldn't be sent. Please try again.") };
  }
}

export async function simulateChargebackAction(
  input: z.input<typeof ChargebackInput>,
): Promise<ActionResult> {
  const parsed = ChargebackInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This payment can't be charged back." };

  const { paymentId, location } = parsed.data;
  const submerchantId = await resolvePaymentSubmerchant(location);
  if (!submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  try {
    await simulateChargeback(submerchantId, paymentId);
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] chargeback simulation failed", err);
    return { ok: false, error: errorMessage(err, "The chargeback couldn't be simulated. Please try again.") };
  }
}

export async function acceptChargebackAction(input: z.input<typeof ChargebackInput>): Promise<ActionResult> {
  const parsed = ChargebackInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This chargeback can't be accepted." };

  const { paymentId, location } = parsed.data;
  const submerchantId = await resolvePaymentSubmerchant(location);
  if (!submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  try {
    await acceptChargeback(submerchantId, paymentId);
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] accepting chargeback failed", err);
    return { ok: false, error: errorMessage(err, "The chargeback couldn't be accepted. Please try again.") };
  }
}

export async function saveChargebackDraftAction(input: z.input<typeof SaveDraftInput>): Promise<ActionResult> {
  const parsed = SaveDraftInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This draft is too long to save." };

  const { paymentId, location, draft } = parsed.data;
  const submerchantId = await resolvePaymentSubmerchant(location);
  if (!submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  try {
    await saveChargebackDraft(submerchantId, paymentId, stripActiveContent(draft));
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] saving chargeback draft failed", err);
    return { ok: false, error: errorMessage(err, "The draft couldn't be saved. Please try again.") };
  }
}

export async function respondToChargebackAction(input: z.input<typeof RespondInput>): Promise<ActionResult> {
  const parsed = RespondInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a written response or a PDF before submitting." };

  const { paymentId, location, response, fileKey } = parsed.data;
  const written = response === undefined ? undefined : stripActiveContent(response);
  if (fileKey === undefined && !plainText(written ?? ""))
    return { ok: false, error: "Write a response before submitting." };
  const evidence = fileKey !== undefined ? { fileKey } : { response: written! };

  const submerchantId = await resolvePaymentSubmerchant(location);
  if (!submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  try {
    await respondToChargeback(submerchantId, paymentId, evidence);
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] chargeback response failed", err);
    return { ok: false, error: errorMessage(err, "The response couldn't be submitted. Please try again.") };
  }
}
