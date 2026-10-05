import type {
  CoinflowCustomerData,
  CoinflowWithdraw,
  CoinflowWithdrawer,
  VerificationStatus,
  WithdrawEnhancedInfo,
  WithdrawerAuditLog,
  WithdrawSpeed,
} from "@/lib/payments/types";

export type WithdrawerVerificationView = {
  status?: VerificationStatus;
  reference?: string;
  vendor?: string;
  rejectionReasons: string[];
};

/** One withdrawer, flattened to what the Withdrawers table shows. */
export type WithdrawerRow = {
  id: string;
  createdAt?: string;
  merchantId?: string;
  wallet: string;
  /** Registered by user id rather than a blockchain wallet. */
  isUser: boolean;
  email?: string;
  currency: string;
  country?: string;
  blocked: boolean;
  /** Set by an operator to never block. */
  override: boolean;
  blockReason?: string;
  verification: WithdrawerVerificationView;
};

export function toWithdrawerRow(withdrawer: CoinflowWithdrawer): WithdrawerRow {
  const status = withdrawer.availability?.status;
  return {
    id: withdrawer._id,
    createdAt: withdrawer.createdAt,
    merchantId: typeof withdrawer.merchant === "object" ? withdrawer.merchant?.merchantId : undefined,
    wallet: withdrawer.wallet,
    isUser: withdrawer.blockchain === "user",
    email: withdrawer.email,
    currency: (withdrawer.currency ?? "USD").toUpperCase(),
    country: withdrawer.country,
    blocked: status === "Blocked",
    override: status === "Override",
    blockReason: status === "Blocked" ? withdrawer.availability?.reason : undefined,
    verification: verificationView(withdrawer.verification),
  };
}

function verificationView(verification: CoinflowWithdrawer["verification"]): WithdrawerVerificationView {
  return {
    status: verification?.status,
    reference: verification?.reference,
    vendor: verification?.vendor,
    rejectionReasons: verification?.rejectionReasons ?? [],
  };
}

/** One withdrawal, flattened to what the Withdraws table shows. */
export type WithdrawRow = {
  id: string;
  createdAt: string;
  merchantId?: string;
  accountId?: string;
  wallet?: string;
  isUser: boolean;
  amountCents: number;
  currency: string;
  /** completed, pending, failed or in_review. */
  status: string;
  returnStatus?: string;
  speed?: WithdrawSpeed;
  expectedDeliveryDate?: string;
  transaction?: string;
  isFirstParty: boolean;
};

export function toWithdrawRow(withdraw: CoinflowWithdraw): WithdrawRow {
  return {
    id: withdraw.transferId,
    createdAt: withdraw.createdAt,
    merchantId: withdraw.merchant?.merchantId,
    accountId: withdraw.accountId,
    wallet: withdraw.wallet,
    isUser: withdraw.blockchain === "user",
    amountCents: withdraw.amount?.cents ?? 0,
    currency: (withdraw.amount?.currency ?? "USD").toUpperCase(),
    status: withdraw.status,
    returnStatus: withdraw.returnStatus,
    speed: withdraw.speed,
    expectedDeliveryDate: withdraw.expectedDeliveryDate,
    transaction: withdraw.transaction,
    isFirstParty: withdraw.isFirstParty ?? false,
  };
}

type PaidBy = { user: number; merchant: number };

/** One withdrawal with its fee breakdown, for the detail drawer. Fees are in the payout currency. */
export type WithdrawDetail = WithdrawRow & {
  blockchain?: string;
  fees: { processing: PaidBy; gas: PaidBy; fx: PaidBy; commission: number };
  settlementCents: number;
  exchangeRate: number;
  failureReason?: string;
  recipient?: { email?: string; phoneNumber?: string; card?: { last4?: string; type?: string; bankName?: string } };
};

export function toWithdrawDetail(withdraw: CoinflowWithdraw, enhanced?: WithdrawEnhancedInfo): WithdrawDetail {
  const rate = withdraw.usdToForeignExchangeRate || 1;
  // Fees are stored in USD; the amount is in the payout currency.
  const convert = (cents?: number) => Math.round((cents ?? 0) * rate);
  const user = withdraw.userPaidFees;
  const merchant = withdraw.merchantPaidFees;
  const userTotal = (user?.fees?.cents ?? 0) + (user?.gasFees?.cents ?? 0) + (user?.swapFees?.cents ?? 0);

  return {
    ...toWithdrawRow(withdraw),
    blockchain: withdraw.blockchain,
    fees: {
      processing: { user: convert(user?.fees?.cents), merchant: convert(merchant?.fees?.cents) },
      gas: { user: convert(user?.gasFees?.cents), merchant: convert(merchant?.gasFees?.cents) },
      fx: { user: convert(user?.swapFees?.cents), merchant: convert(merchant?.swapFees?.cents) },
      commission: convert(user?.customFees?.cents),
    },
    settlementCents: Math.max(0, Math.ceil((withdraw.amount?.cents ?? 0) - userTotal * rate)),
    exchangeRate: rate,
    failureReason: withdraw.status === "failed" ? withdraw.detailMessage : undefined,
    recipient: recipientOf(enhanced),
  };
}

function recipientOf(enhanced?: WithdrawEnhancedInfo): WithdrawDetail["recipient"] {
  if (!enhanced?.info) return undefined;
  if (enhanced.speed === "card") {
    const { last4, type, bankName } = enhanced.info;
    return { card: { last4, type, bankName } };
  }
  return { email: enhanced.info.email, phoneNumber: enhanced.info.phoneNumber };
}

/** Speeds whose recipient details come from the enhanced endpoint. */
export const ENHANCED_SPEEDS: ReadonlySet<string> = new Set(["card", "venmo", "paypal"]);

export type PayoutMethod = {
  key: string;
  title: string;
  subtitle: string;
  token: string;
};

export type PayoutMethodGroup = { kind: "card" | "bank" | "iban" | "pix" | "venmo" | "paypal" | "interac"; title: string; methods: PayoutMethod[] };

export type AuditEntry = {
  editor: string;
  editorType?: string;
  ip?: string;
  createdAt?: string;
  changes: { path: string; before?: string; after?: string }[];
};

/** Everything the withdrawer drawer shows beyond the table row. */
export type WithdrawerProfile = {
  payouts: WithdrawRow[];
  paymentsCount: number;
  methodGroups: PayoutMethodGroup[];
  methodCount: number;
  referenceKeys: { merchantId: string; referenceId: string }[];
  verifications: WithdrawerVerificationView[];
  auditLog: AuditEntry[];
};

const last4 = (token: string) => `····${token.slice(-4)}`;

function methodGroups(data: CoinflowCustomerData): PayoutMethodGroup[] {
  const purses = data.purses ?? [];
  const live = <T extends { isDeleted?: boolean }>(items: (T | undefined)[]) =>
    items.filter((item): item is T => !!item && !item.isDeleted);

  const cards = live(purses.flatMap((purse) => purse.cards ?? [])).map((card) => ({
    key: card.token,
    token: card.token,
    title: `${card.type ?? "Card"} ····${card.last4 ?? card.token.slice(-4)}`,
    subtitle: card.createdAt
      ? `Card · Added ${new Date(card.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`
      : "Card",
  }));
  const banks = live(purses.flatMap((purse) => purse.accounts ?? [])).map((account) => ({
    key: account.token,
    token: account.token,
    title: `${account.alias || "Bank account"} ····${account.last4 ?? account.token.slice(-4)}`,
    subtitle: "US Bank account",
  }));
  const ibans = live(purses.flatMap((purse) => purse.ibans ?? [])).map((iban) => ({
    key: iban.token,
    token: iban.token,
    title: `${iban.alias || "IBAN"} ····${iban.last4 ?? iban.token.slice(-4)}`,
    subtitle: "International bank",
  }));
  const pixes = live(purses.flatMap((purse) => purse.pixes ?? [])).map((pix) => ({
    key: pix.token,
    token: pix.token,
    title: `PIX · ${last4(pix.token)}`,
    subtitle: "PIX key",
  }));
  const linked = (method: "venmo" | "paypal" | "interac", label: string) =>
    live(purses.map((purse) => purse[method])).map((account) => ({
      key: account.token,
      token: account.token,
      title: account.alias || label,
      subtitle: `Linked · ${last4(account.token)}`,
    }));

  const groups: PayoutMethodGroup[] = [
    { kind: "card", title: "Cards", methods: cards },
    { kind: "bank", title: "US Bank Accounts", methods: banks },
    { kind: "iban", title: "International Banks", methods: ibans },
    { kind: "pix", title: "PIX Accounts", methods: pixes },
    { kind: "venmo", title: "Venmo", methods: linked("venmo", "Venmo") },
    { kind: "paypal", title: "PayPal", methods: linked("paypal", "PayPal") },
    { kind: "interac", title: "Interac", methods: linked("interac", "Interac") },
  ];
  return groups.filter((group) => group.methods.length > 0);
}

function display(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Flattens `{a: {b: {before, after}}}` style diffs into dotted paths. */
function changesOf(modifications: unknown, prefix = ""): AuditEntry["changes"] {
  if (!modifications || typeof modifications !== "object") return [];
  if (Array.isArray(modifications)) {
    return modifications.flatMap((item) => {
      const entry = item as { path?: unknown; before?: unknown; after?: unknown; old?: unknown; new?: unknown };
      if (typeof entry?.path === "string")
        return [{ path: entry.path, before: display(entry.before ?? entry.old), after: display(entry.after ?? entry.new) }];
      return changesOf(item, prefix);
    });
  }
  const record = modifications as Record<string, unknown>;
  if ("before" in record || "after" in record)
    return [{ path: prefix || "value", before: display(record.before), after: display(record.after) }];
  return Object.entries(record).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") return changesOf(value, path);
    return [{ path, after: display(value) }];
  });
}

export function toWithdrawerProfile(data: CoinflowCustomerData, auditLogs: WithdrawerAuditLog[]): WithdrawerProfile {
  const groups = methodGroups(data);
  const referenceKeys = (data.purses ?? []).flatMap((purse) => purse.keys ?? []);
  return {
    payouts: (data.payouts ?? [])
      .map(toWithdrawRow)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    paymentsCount: data.payments?.length ?? 0,
    methodGroups: groups,
    methodCount: groups.reduce((sum, group) => sum + group.methods.length, 0) + referenceKeys.length,
    referenceKeys,
    verifications: (data.verifications ?? []).map(verificationView),
    auditLog: auditLogs.map((log) => ({
      editor: log.editor ?? "System",
      editorType: log.editorType,
      ip: log.ip,
      createdAt: log.createdAt,
      changes: changesOf(log.modifications),
    })),
  };
}
