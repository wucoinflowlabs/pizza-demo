import "server-only";
import { paymentsRequest } from "./client";

export type VerificationStatus =
  | "pending"
  | "partialApproval"
  | "approved"
  | "rejected"
  | (string & {});

type AdditionalVerification = {
  name: string;
  link: string;
  reference: string;
  vendor: string;
  sessionToken?: string;
};

type MerchantV2Response = {
  merchant: {
    merchantId: string;
    users?: { email?: string }[];
    verification?: {
      status?: VerificationStatus;
      reference?: string;
      sessionToken?: string;
    };
    goLiveChecklist?: {
      onboardingFormSubmitted?: boolean;
      applicationSubmitted?: boolean;
    };
  };
  verificationLinks?: {
    merchantLink?: string;
    uboLinks?: AdditionalVerification[];
  };
};

export type EmbeddedInquiry = {
  inquiryId: string;
  sessionToken?: string;
};

export type OwnerInquiry = EmbeddedInquiry & { name: string; link: string };

/** Everything the business journey needs — and nothing else — from the merchant record. */
export type SubmerchantProgress = {
  merchantId: string;
  accountEmail?: string;
  verificationStatus: VerificationStatus;
  businessInquiry?: EmbeddedInquiry;
  ownerInquiries: OwnerInquiry[];
  onboardingFormSubmitted: boolean;
  applicationSubmitted: boolean;
};

/**
 * Reading the merchant also makes the provider re-check the verification
 * case, so this doubles as the status poll after a Persona flow completes.
 */
export async function getSubmerchantProgress(
  submerchantId: string,
): Promise<SubmerchantProgress> {
  const { merchant, verificationLinks } =
    await paymentsRequest<MerchantV2Response>({
      method: "GET",
      path: "/merchant/v2",
      asSubmerchant: submerchantId,
    });

  const reference = merchant.verification?.reference;
  const businessInquiry =
    verificationLinks?.merchantLink && reference
      ? { inquiryId: reference, sessionToken: merchant.verification?.sessionToken }
      : undefined;

  return {
    merchantId: merchant.merchantId,
    accountEmail: merchant.users?.[0]?.email,
    verificationStatus: merchant.verification?.status ?? "pending",
    businessInquiry,
    ownerInquiries: (verificationLinks?.uboLinks ?? []).map((ubo) => ({
      name: ubo.name,
      link: ubo.link,
      inquiryId: ubo.reference,
      sessionToken: ubo.sessionToken,
    })),
    onboardingFormSubmitted: Boolean(
      merchant.goLiveChecklist?.onboardingFormSubmitted,
    ),
    applicationSubmitted: Boolean(
      merchant.goLiveChecklist?.applicationSubmitted,
    ),
  };
}
