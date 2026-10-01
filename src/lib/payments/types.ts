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
