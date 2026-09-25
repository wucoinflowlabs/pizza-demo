"use server";

import { PaymentsError, type PaymentsErrorCode } from "@/lib/payments/errors";
import {
  createSubmerchant,
  updateSubmerchant,
} from "@/lib/payments/submerchants";
import type { SubmerchantFields } from "@/lib/payments/types";
import {
  clearCurrentAccountId,
  getCurrentAccountId,
  setCurrentAccountId,
} from "@/lib/session";
import { generateAccountId } from "./account-id";
import {
  accountToFields,
  contactToFields,
  onlinePresenceToFields,
  paymentsToFields,
} from "./mappers";
import {
  accountSchema,
  applicationSchema,
  contactSchema,
  onlinePresenceSchema,
  paymentsSchema,
} from "./schema";

export type ActionErrorCode = PaymentsErrorCode | "NO_APPLICATION";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string; field?: string };

const INVALID_INPUT: ActionResult<never> = {
  ok: false,
  code: "INVALID_FIELDS",
  message: "Please check the highlighted fields and try again.",
};

const NO_APPLICATION: ActionResult<never> = {
  ok: false,
  code: "NO_APPLICATION",
  message: "We couldn't find your application. Let's start again.",
};

async function toFailure(err: unknown): Promise<ActionResult<never>> {
  if (!(err instanceof PaymentsError)) {
    console.error("[onboarding] unexpected error", err);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Please try again.",
    };
  }

  if (err.code === "NOT_FOUND") await clearCurrentAccountId();
  return {
    ok: false,
    code: err.code,
    message: err.userMessage,
    field: err.code === "EMAIL_TAKEN" ? "email" : undefined,
  };
}

async function createAccount({
  email,
  fields,
  businessName,
}: {
  email: string;
  fields: SubmerchantFields;
  businessName: string;
}): Promise<string> {
  const attempt = async () => {
    const merchantId = generateAccountId(businessName);
    await createSubmerchant({ merchantId, email, ...fields });
    return merchantId;
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "ACCOUNT_ID_TAKEN")
      return attempt();
    throw err;
  }
}

async function updateCurrentAccount(
  fields: SubmerchantFields,
): Promise<ActionResult> {
  const merchantId = await getCurrentAccountId();
  if (!merchantId) return NO_APPLICATION;

  try {
    await updateSubmerchant({ merchantId, fields });
    return { ok: true, data: undefined };
  } catch (err) {
    return toFailure(err);
  }
}

/**
 * Step 1. Creates the sub-merchant the first time; afterwards `email` is
 * immutable, so only the business name and industry are updated.
 */
export async function saveAccount({
  values,
  accountExists,
}: {
  values: unknown;
  accountExists: boolean;
}): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const fields = accountToFields(parsed.data);
  if (accountExists && (await getCurrentAccountId()))
    return updateCurrentAccount(fields);

  try {
    const merchantId = await createAccount({
      email: parsed.data.email,
      fields,
      businessName: parsed.data.dba,
    });
    await setCurrentAccountId(merchantId);
    return { ok: true, data: undefined };
  } catch (err) {
    return toFailure(err);
  }
}

export async function saveContact(values: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;
  return updateCurrentAccount(contactToFields(parsed.data));
}

export async function saveOnlinePresence(
  values: unknown,
): Promise<ActionResult> {
  const parsed = onlinePresenceSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;
  return updateCurrentAccount(onlinePresenceToFields(parsed.data));
}

export async function savePayments(values: unknown): Promise<ActionResult> {
  const parsed = paymentsSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;
  return updateCurrentAccount(paymentsToFields(parsed.data));
}

/**
 * Re-sends every answer so the saved draft matches the review screen
 * exactly. The provider has no underwriting-submission endpoint, so the
 * application intentionally remains a draft on their side.
 */
export async function submitApplication(
  values: unknown,
): Promise<ActionResult<{ referenceId: string }>> {
  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const merchantId = await getCurrentAccountId();
  if (!merchantId) return NO_APPLICATION;

  const { account, contact, onlinePresence, payments } = parsed.data;
  const result = await updateCurrentAccount({
    ...accountToFields(account),
    ...contactToFields(contact),
    ...onlinePresenceToFields(onlinePresence),
    ...paymentsToFields(payments),
  });
  if (!result.ok) return result;
  return { ok: true, data: { referenceId: merchantId } };
}

export async function resetApplication(): Promise<void> {
  await clearCurrentAccountId();
}
