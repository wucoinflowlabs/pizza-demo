"use server";

import { randomUUID } from "node:crypto";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { PaymentsError } from "@/lib/payments/errors";
import { sendSandboxMirrorPayout } from "@/lib/payments/real-payout";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { shopTimeZone } from "../load-payments-series";
import { getSessionSubmerchant } from "../session-submerchant";
import { loadTipSummary } from "./queries";
import { loadTipRecipient } from "./recipient";

type Result = { ok: true; cents: number } | { ok: false; error: string };

type Scope = { shopId: string; submerchantId: string };

/** Resolves which shop + sub-merchant to cash out for, in both single and franchise sessions. */
async function resolveScope(locationId?: string): Promise<{ scope?: Scope; error?: string }> {
  const franchise = await getSessionFranchise();
  if (franchise) {
    const picked = parseLocation(locationId, franchise.locations) ?? enrolledLocations(franchise.locations)[0];
    if (!picked) return { error: "No enrolled shop to cash out from." };
    const { data: shop } = await getSupabaseAdmin()
      .from("shops")
      .select("id")
      .eq("cf_submerchant_id", picked.submerchantId)
      .maybeSingle();
    if (!shop?.id) return { error: `Shop record missing for ${picked.label}.` };
    return { scope: { shopId: shop.id, submerchantId: picked.submerchantId } };
  }
  const session = await getSessionSubmerchant();
  if (!session) return { error: "Sign in again." };
  if (!session.submerchantId) return { error: "Enroll in Adora Pay first." };
  return { scope: { shopId: session.login.id, submerchantId: session.submerchantId } };
}

/**
 * Pays the recipient's unpaid tip balance via the sandbox delegated Venmo
 * payout. Sandbox-only — does NOT touch the production merchant. Writes a
 * `payouts` row with the sandbox cf_transfer_id so the balance resets to zero.
 * Accepts a franchise owner's picked location so they can cash out any store.
 */
export async function cashOutTipsAction({
  locationId,
  staffId,
}: {
  locationId?: string;
  /** When set, cash out this specific staff instead of the env-designated recipient. */
  staffId?: string;
} = {}): Promise<Result> {
  const resolved = await resolveScope(locationId);
  if (!resolved.scope) return { ok: false, error: resolved.error ?? "Can't cash out from this view." };
  const { shopId, submerchantId } = resolved.scope;

  const recipient = staffId
    ? await loadStaffRecipient({ shopId, staffId })
    : await loadTipRecipient({ shopId, submerchantId });
  if (!recipient) return { ok: false, error: "No tip recipient configured for this shop." };
  if (!recipient.venmo?.token) return { ok: false, error: `${recipient.name} has no Venmo payout method linked.` };

  const { data: shopTz } = await getSupabaseAdmin().from("shops").select("timezone").eq("id", shopId).maybeSingle();
  const timeZone = shopTz?.timezone ?? (await shopTimeZone(shopId).catch(() => "America/Los_Angeles"));
  const summary = await loadTipSummary({ shopId, staffId: recipient.staffId, timeZone });
  if (summary.unpaidCents <= 0) return { ok: false, error: "No unpaid tips to cash out." };

  const idempotencyKey = randomUUID();
  try {
    const result = await sendSandboxMirrorPayout({
      submerchantId,
      cents: summary.unpaidCents,
      idempotencyKey,
    });
    const supabase = getSupabaseAdmin();
    const { data: account } = await supabase
      .from("payout_accounts")
      .select("id")
      .eq("shop_id", shopId)
      .eq("staff_id", recipient.staffId)
      .eq("rail", "venmo")
      .limit(1)
      .maybeSingle();
    if (account) {
      await supabase.from("payouts").insert({
        shop_id: shopId,
        payout_account_id: account.id,
        rail: "venmo",
        amount_cents: summary.unpaidCents,
        status: "pending",
        cf_transfer_id: result.signature ?? idempotencyKey,
      });
    }
    return { ok: true, cents: summary.unpaidCents };
  } catch (err) {
    console.error("[tips] cash out failed", err);
    return { ok: false, error: err instanceof PaymentsError ? err.userMessage : "Couldn't cash out tips." };
  }
}


/** Resolves a staff row + Venmo payout method straight from Supabase. */
async function loadStaffRecipient({ shopId, staffId }: { shopId: string; staffId: string }) {
  const supabase = getSupabaseAdmin();
  const { data: staff } = await supabase
    .from("staff")
    .select("id,name,cf_user_id")
    .eq("shop_id", shopId)
    .eq("id", staffId)
    .maybeSingle();
  if (!staff) return undefined;
  const { data: venmo } = await supabase
    .from("payout_accounts")
    .select("display,cf_destination_id")
    .eq("shop_id", shopId)
    .eq("staff_id", staff.id)
    .eq("rail", "venmo")
    .maybeSingle();
  return {
    staffId: staff.id,
    cfUserId: staff.cf_user_id,
    name: staff.name,
    venmo: venmo?.cf_destination_id
      ? { token: venmo.cf_destination_id, display: venmo.display ?? "Venmo" }
      : undefined,
  };
}
