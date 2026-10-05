export type SubmerchantFields = {
  dba?: string;
  industry?: string;
  businessEmail?: string;
  businessPhoneNumber?: string;
  businessPhoneCountryCode?: string;
  billingEmail?: string;
  websiteUrls?: string[];
  developmentUrls?: string[];
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  returnPolicyUrl?: string;
  /** Comma-separated list of pay-in method values. */
  payinMethods?: string;
  /** Comma-separated list of payout method values. */
  payoutMethods?: string;
};

export type CreateSubmerchantInput = SubmerchantFields & {
  merchantId: string;
  email: string;
};

export type SubmerchantDraft = SubmerchantFields & {
  merchantId: string;
  email?: string;
};

export type Submerchant = {
  merchantId: string;
  verification?: { status?: string };
  [key: string]: unknown;
};

type Money = { cents?: number; currency?: string };

/** Per-method details. Exactly one is present on a payment, and it carries the status. */
type PaymentMethodInfo = { status?: string; [key: string]: unknown };

/** The fields the dashboard reads from `GET /merchant/payments`. */
export type CoinflowPayment = {
  paymentId: string;
  createdAt: string;
  totals?: { subtotal?: Money; total?: Money };
  cardInfo?: PaymentMethodInfo;
  bankTransferInfo?: PaymentMethodInfo;
  cryptoInfo?: PaymentMethodInfo;
  cashAppInfo?: PaymentMethodInfo;
  paypalInfo?: PaymentMethodInfo;
  venmoInfo?: PaymentMethodInfo;
  pixInfo?: PaymentMethodInfo;
  ibanInfo?: PaymentMethodInfo;
  wireInfo?: PaymentMethodInfo;
};

type CurrencyCents = { cents: number; currency?: string };

/** `enhancedTxInfo` on `GET /merchant/payments/{paymentId}`. Card payments only. */
export type EnhancedTxInfo = {
  firstName?: string;
  lastName?: string;
  nameOnFile?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  email?: string;
  bin?: string;
  ip?: string;
  expMonth?: string;
  expYear?: string;
  avsResponseCode?: string;
  cvvResponseCode?: string;
  binLocation?: {
    cardType?: string;
    cardName?: string;
    cardSegment?: string;
    /** Undocumented shape; read defensively. */
    country?: unknown;
    bankName?: string;
    bin?: string;
  };
  ipLocation?: {
    lat?: string;
    lon?: string;
    country?: string;
    region?: string;
    isp?: string;
    city?: string;
    zip?: string;
    proxy?: boolean;
    mobile?: boolean;
    hosting?: boolean;
  };
  deviceInfo?: {
    browser?: { name?: string; version?: string; major?: string };
    device?: { model?: string; type?: string; vendor?: string };
    engine?: { name?: string; version?: string };
    os?: { name?: string; version?: string };
  };
  secureDS?: {
    authenticationStatus?: string;
    challengeState?: string;
    version?: string;
  } | null;
  authCodeDetails?: { code?: string; title?: string; message?: string; action?: string } | null;
  declineExplanation?: { summary?: string; explanation?: string; remediation?: string; keyFactors?: string[] };
};

/** `GET /merchant/payments/{paymentId}`: the list fields plus everything the detail drawer reads. */
export type CoinflowPaymentDetail = CoinflowPayment & {
  totals?: Partial<
    Record<
      | "subtotal"
      | "creditCardFees"
      | "chargebackProtectionFees"
      | "gasFees"
      | "fxFees"
      | "networkFees"
      | "payInFees"
      | "total",
      CurrencyCents
    >
  >;
  customer?: { customerId?: string; email?: string; [key: string]: unknown };
  wallet?: string;
  chargebackProtectionDecision?: string;
  refundInfo?: { count?: number; refundedAt?: string; amount?: CurrencyCents };
  sessionInfo?: { userAgent?: string; endUserIp?: string };
  enhancedTxInfo?: EnhancedTxInfo;
};

export type RefundReason = "userCancellation" | "failedFulfillment" | "buyerFraud" | "other";

/** `GET /merchant/payments/{paymentId}/refund-quote`. */
export type RefundQuote = {
  subtotal: CurrencyCents;
  processorFees: CurrencyCents;
  total: CurrencyCents;
  rate?: number;
  resolution?: CurrencyCents;
  adjustment?: CurrencyCents;
};

export type AvailabilityStatus = "Functional" | "Blocked" | "Override";

export type VerificationStatus = "pending" | "partial-approval" | "approved" | "rejected" | "expired";

export type WithdrawerVerification = {
  reference?: string;
  status?: VerificationStatus;
  vendor?: string;
  rejectionReasons?: string[];
};

/** A row of `GET /merchant/withdrawers`. `merchant` is the full merchant document, so never forward it. */
export type CoinflowWithdrawer = {
  _id: string;
  wallet: string;
  blockchain?: string;
  email?: string;
  availability?: { status?: AvailabilityStatus; reason?: string; updatedAt?: string };
  verification?: WithdrawerVerification;
  currency?: string;
  country?: string;
  merchant?: { merchantId?: string } | string;
  createdAt?: string;
  user?: boolean;
  business?: boolean;
};

export type WithdrawSpeed =
  | "asap"
  | "same_day"
  | "standard"
  | "card"
  | "iban"
  | "pix"
  | "eft"
  | "venmo"
  | "paypal"
  | "wire"
  | "interac"
  | "swift"
  | "crypto";

type WithdrawFees = { fees?: CurrencyCents; gasFees?: CurrencyCents; swapFees?: CurrencyCents; customFees?: CurrencyCents };

/** A row of `GET /merchant/withdraws`. */
export type CoinflowWithdraw = {
  _id: string;
  transferId: string;
  wallet?: string;
  blockchain?: string;
  transaction?: string;
  accountId?: string;
  amount: CurrencyCents;
  usdToForeignExchangeRate?: number;
  userPaidFees?: WithdrawFees;
  merchantPaidFees?: WithdrawFees;
  status: string;
  returnStatus?: string;
  expectedDeliveryDate?: string;
  merchant?: { merchantId?: string };
  createdAt: string;
  speed?: WithdrawSpeed;
  userId?: string;
  detailMessage?: string;
  isFirstParty?: boolean;
  idempotencyKey?: string;
};

/** `GET /merchant/withdraws/{transferId}/enhanced`. Card, Venmo and PayPal only. */
export type WithdrawEnhancedInfo =
  | { speed: "card"; info: { last4?: string; bin?: string; type?: string; bankName?: string; country?: string } }
  | { speed: "paypal" | "venmo"; info: { email?: string; phoneNumber?: string } };

type PurseMethod = { alias?: string; token: string; isDeleted?: boolean };

/** `GET /merchant/withdrawer/{id}/profile`. */
export type CoinflowCustomerData = {
  emails?: string[];
  kycName?: string;
  payouts?: CoinflowWithdraw[];
  payments?: CoinflowPayment[];
  verifications?: WithdrawerVerification[];
  purses?: {
    keys?: { referenceId: string; merchantId: string }[];
    accounts?: (PurseMethod & { last4?: string })[];
    cards?: (PurseMethod & { last4?: string; type?: string; createdAt?: string })[];
    ibans?: (PurseMethod & { last4?: string })[];
    pixes?: PurseMethod[];
    venmo?: PurseMethod;
    paypal?: PurseMethod;
    interac?: PurseMethod;
  }[];
};

/** `GET /merchant/withdrawer/{id}/audit-logs`. */
export type WithdrawerAuditLog = {
  editor?: string;
  editorType?: string;
  ip?: string;
  createdAt?: string;
  modifications?: unknown;
};

/** One row of `GET /merchant/chargebacks`, limited to the fields the dashboard reads. */
export type CoinflowChargeback = {
  _id: string;
  chargebackId?: string;
  createdAt: string;
  updatedAt?: string;
  /** When the processor loaded the dispute. */
  loadedOn?: string;
  customer?: string;
  arn?: string;
  reasonCode?: string;
  reasonDescription?: string;
  respondByDate?: string;
  responded?: boolean;
  merchantRespondedAt?: string;
  accepted?: boolean;
  decidedAt?: string;
  decidedLostAt?: string;
  chargebackFeeCents?: number;
  disputedAmount?: CurrencyCents;
  outstanding?: CurrencyCents;
  secureDs?: { authenticationStatus?: string; challengeState?: string } | null;
  /** Set once the disputed payment has been refunded. */
  refund?: unknown;
  /** Usually the full payment, but read defensively in case only the id is sent. */
  payment?:
    | (CoinflowPayment & {
        chargebackProtectionDecision?: string;
        customer?: unknown;
        refundInfo?: { amount?: CurrencyCents };
      })
    | string;
};

/** `GET /merchant/chargebacks/{paymentId}`. */
export type CoinflowChargebackDetail = {
  chargeback: Omit<CoinflowChargeback, "payment"> & { shouldFight?: boolean; payment?: unknown };
  payment?: CoinflowChargeback["payment"];
  customer?: unknown;
};
