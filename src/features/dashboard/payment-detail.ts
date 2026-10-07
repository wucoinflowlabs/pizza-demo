import { marketplaceFeeCents } from "@/features/statements/statement";
import type { CoinflowPaymentDetail } from "@/lib/payments/types";
import { toOrder, type OrderMethod } from "./orders";

type Line = { label: string; cents: number };

/** One payment, flattened to what the detail drawer shows. Only fields that are displayed reach the browser. */
export type PaymentDetail = {
  id: string;
  createdAt: string;
  status?: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  fees: Line[];
  /** Adora's SaaS fee and the franchise royalty, which Coinflow nets out before the restaurant settles. */
  adoraFeesCents: number;
  refundedCents: number;
  refundedAt?: string;
  /** Settled payments with something left to refund. */
  refundable: boolean;
  /** Settled card payments, which a sandbox chargeback can be opened on. */
  chargebackable: boolean;
  /** Authorized, uncaptured card payments, which can take a tip before capture. */
  tipAdjustable: boolean;
  method: OrderMethod;
  card?: {
    bin?: string;
    expiry?: string;
    holder?: string;
    address?: string;
    issuer?: { bank?: string; type?: string; segment?: string; product?: string; country?: string };
  };
  /** A short descriptor for non-card methods, e.g. the crypto token and chain. */
  methodNote?: string;
  protection: { decision?: string; description: string };
  threeDs: { status?: string; detail: string };
  decline?: { code?: string; title?: string; message?: string; action?: string; summary?: string; remediation?: string };
  ip?: {
    address: string;
    place?: string;
    isp?: string;
    flags: string[];
  };
  device?: { browser?: string; browserDetail?: string; device?: string; os?: string };
  avs?: { code: string; description: string };
  cvv?: { code: string; description: string };
  statementDescriptor?: string;
  customer: { id?: string; email?: string; name?: string; address?: string; country?: string };
};

const FEE_LABELS = {
  creditCardFees: "Card processing",
  chargebackProtectionFees: "Chargeback protection",
  gasFees: "Network gas",
  fxFees: "FX",
  networkFees: "Network",
  payInFees: "Pay-in",
} as const;

/** Standard AVS result codes. */
const AVS_CODES: Record<string, string> = {
  A: "Street address matches, ZIP doesn't",
  B: "Street address matches, postal code not verified",
  C: "Street address and postal code not verified",
  D: "Street address and postal code match",
  E: "AVS error",
  G: "Issuer doesn't support AVS",
  I: "Address not verified",
  M: "Street address and postal code match",
  N: "Neither street address nor ZIP match",
  O: "No AVS response",
  P: "Postal code matches, street address not verified",
  R: "Issuer unavailable, retry",
  S: "AVS not supported",
  U: "Address information unavailable",
  W: "Nine-digit ZIP matches, street address doesn't",
  X: "Street address and nine-digit ZIP match",
  Y: "Address (street) and five-digit ZIP match",
  Z: "Five-digit ZIP matches, street address doesn't",
};

const CVV_CODES: Record<string, string> = {
  M: "CVV matches",
  N: "CVV doesn't match",
  P: "CVV not processed",
  S: "CVV should be on the card but wasn't provided",
  U: "Issuer not certified for CVV",
  X: "No CVV response",
};

const PROTECTION_COPY: [RegExp, string][] = [
  [/^approved$/i, "All chargeback liability is shifted for this payment"],
  [/^rejected$/i, "This payment isn't covered; chargeback liability stays with the merchant"],
  [/overridden/i, "The decision was overridden; chargeback liability stays with the merchant"],
  [/pending/i, "This payment is being reviewed for chargeback protection"],
  [/not enabled/i, "Chargeback protection isn't enabled for this payment"],
  [/not reviewed/i, "This payment wasn't reviewed for chargeback protection"],
];

const REFUNDABLE_STATUSES = new Set(["SETTLED", "DEPOSITED"]);
const AUTHORIZED = /^AUTHORI[SZ]ED$/;

function join(parts: (string | undefined)[], separator = ", ") {
  const kept = parts.map((part) => part?.trim()).filter(Boolean);
  return kept.length ? kept.join(separator) : undefined;
}

function countryName(value: unknown) {
  if (typeof value === "string") return value || undefined;
  if (!value || typeof value !== "object") return undefined;
  const country = value as Record<string, unknown>;
  for (const key of ["alpha2", "name", "iso", "code", "alpha3"]) {
    if (typeof country[key] === "string" && country[key]) return country[key] as string;
  }
  return undefined;
}

function expiry(month?: string, year?: string) {
  if (!month || !year) return undefined;
  return `${month.padStart(2, "0")}/${year.slice(-2)}`;
}

function threeDsOf(payment: CoinflowPaymentDetail): PaymentDetail["threeDs"] {
  const secure = payment.enhancedTxInfo?.secureDS;
  if (secure?.authenticationStatus) {
    const challenge =
      secure.challengeState && secure.challengeState !== "NotApplicable" ? `challenge ${secure.challengeState}` : undefined;
    return {
      status: secure.authenticationStatus,
      detail: join([`3-D Secure ${secure.authenticationStatus}`, challenge, secure.version && `v${secure.version}`], " · ")!,
    };
  }
  const processed = payment.cardInfo?.processed3DS;
  if (typeof processed === "string" && processed !== "NotApplicable") {
    return { status: processed, detail: `3-D Secure ${processed.toLowerCase()} for this transaction` };
  }
  return { detail: "3-D Secure not enabled for this transaction" };
}

export function toPaymentDetail(payment: CoinflowPaymentDetail): PaymentDetail {
  const order = toOrder(payment);
  const enhanced = payment.enhancedTxInfo;
  const totals = payment.totals ?? {};
  const subtotalCents = totals.subtotal?.cents ?? 0;
  const refundedCents = payment.refundInfo?.amount?.cents ?? 0;
  const status = order.status?.toUpperCase();
  const failed = status === "FAILED";

  const holder = enhanced?.nameOnFile || join([enhanced?.firstName, enhanced?.lastName], " ");
  const address = join([enhanced?.streetAddress, enhanced?.city, join([enhanced?.state, enhanced?.zip], " "), enhanced?.country]);
  const bin = enhanced?.binLocation;
  const ipLocation = enhanced?.ipLocation;
  const ipAddress = enhanced?.ip ?? payment.sessionInfo?.endUserIp;
  const device = enhanced?.deviceInfo;
  const decision = payment.chargebackProtectionDecision;
  const crypto = payment.cryptoInfo;

  const decline = failed
    ? {
        code: enhanced?.authCodeDetails?.code ?? order.code,
        title: enhanced?.authCodeDetails?.title,
        message: enhanced?.authCodeDetails?.message,
        action: enhanced?.authCodeDetails?.action,
        summary: enhanced?.declineExplanation?.summary,
        remediation: enhanced?.declineExplanation?.remediation,
      }
    : undefined;

  return {
    id: payment.paymentId,
    createdAt: payment.createdAt,
    status: order.status,
    currency: totals.subtotal?.currency ?? "USD",
    subtotalCents,
    totalCents: totals.total?.cents ?? subtotalCents,
    fees: Object.entries(FEE_LABELS)
      .map(([key, label]) => ({ label, cents: totals[key as keyof typeof FEE_LABELS]?.cents ?? 0 }))
      .filter((line) => line.cents !== 0),
    adoraFeesCents: marketplaceFeeCents(payment),
    refundedCents,
    refundedAt: payment.refundInfo?.refundedAt,
    refundable: !!status && REFUNDABLE_STATUSES.has(status) && refundedCents < subtotalCents,
    chargebackable: order.method.key === "card" && !!status && REFUNDABLE_STATUSES.has(status),
    tipAdjustable: order.method.key === "card" && !!status && AUTHORIZED.test(status),
    method: order.method,
    card:
      order.method.key === "card"
        ? {
            bin: enhanced?.bin ?? bin?.bin,
            expiry: expiry(enhanced?.expMonth, enhanced?.expYear),
            holder,
            address,
            issuer: bin && {
              bank: bin.bankName,
              type: bin.cardType,
              segment: bin.cardSegment,
              product: bin.cardName,
              country: countryName(bin.country),
            },
          }
        : undefined,
    methodNote: crypto
      ? join([crypto.paymentCurrency as string | undefined, crypto.chainName as string | undefined], " on ")
      : undefined,
    protection: {
      decision,
      description:
        PROTECTION_COPY.find(([pattern]) => decision && pattern.test(decision))?.[1] ??
        "No chargeback protection decision for this payment",
    },
    threeDs: threeDsOf(payment),
    decline: decline && Object.values(decline).some(Boolean) ? decline : undefined,
    ip: ipAddress
      ? {
          address: ipAddress,
          place: join([ipLocation?.city, ipLocation?.region, ipLocation?.country, ipLocation?.zip]),
          isp: ipLocation?.isp,
          flags: [
            ipLocation?.proxy && "Proxy / VPN",
            ipLocation?.hosting && "Hosting provider",
            ipLocation?.mobile && "Mobile network",
          ].filter((flag): flag is string => !!flag),
        }
      : undefined,
    device: device && {
      browser: device.browser?.name,
      browserDetail: join([
        device.browser?.version && `Version ${device.browser.version}`,
        device.engine?.name && `${device.engine.name} engine`,
      ]),
      device: join([device.device?.vendor, device.device?.model, device.device?.type ?? "desktop"]),
      os: join([device.os?.name, device.os?.version && `version ${device.os.version}`], " "),
    },
    avs: enhanced?.avsResponseCode
      ? { code: enhanced.avsResponseCode, description: AVS_CODES[enhanced.avsResponseCode] ?? "Unknown AVS result" }
      : undefined,
    cvv: enhanced?.cvvResponseCode
      ? { code: enhanced.cvvResponseCode, description: CVV_CODES[enhanced.cvvResponseCode] ?? "Unknown CVV result" }
      : undefined,
    statementDescriptor:
      typeof payment.cardInfo?.statementDescriptor === "string" ? payment.cardInfo.statementDescriptor : undefined,
    customer: {
      id: order.customer,
      email: enhanced?.email ?? payment.customer?.email,
      name: holder,
      address,
      country: enhanced?.country,
    },
  };
}
