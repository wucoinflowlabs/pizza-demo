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
