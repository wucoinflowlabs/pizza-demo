export type SubmerchantFields = {
  dba?: string;
  industry?: string;
  businessEmail?: string;
  businessPhoneNumber?: string;
  businessPhoneCountryCode?: string;
  billingEmail?: string;
  billingEmailSameAsBusinessEmail?: boolean;
  websiteUrls?: string[];
  developmentUrls?: string[];
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  returnPolicyUrl?: string;
  /** Comma-separated list of pay-in method values. */
  payinMethods?: string;
  /** Comma-separated list of payout method values. */
  payoutMethods?: string;
  /** Comma-separated list of jurisdiction values. */
  endUserJurisdictions?: string;
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
