import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { describeWebhook } from "@/lib/devtools/labels";
import { redact } from "@/lib/devtools/redact";
import { recordEvent } from "@/lib/devtools/store";

type WebhookBody = {
  eventType?: string;
  category?: string;
  data?: { merchantId?: string };
};

// Coinflow sends the dashboard's Webhook Validation Key as the raw Authorization header.
function isFromCoinflow(authorization: string | null) {
  const key = process.env.PAYMENTS_WEBHOOK_VALIDATION_KEY;
  if (!key || !authorization) return false;
  const expected = Buffer.from(key);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Events that change what /operator renders (approval pills, settlement sweep
// state, status timestamps). On any of these, blow the cache so the operator
// sees fresh data on their next visit.
const OPERATOR_INVALIDATING_EVENTS = new Set([
  "Sub-merchant KYB Created",
  "Sub-merchant KYB Success",
  "Sub-merchant KYB Failure",
  "Seller Blocked",
]);

export async function POST(request: NextRequest) {
  const verified = isFromCoinflow(request.headers.get("authorization"));
  const text = await request.text();

  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // Still shown in the panel, as raw text.
  }
  const body = (payload && typeof payload === "object" ? payload : {}) as WebhookBody;
  const eventType = body.eventType ?? body.category ?? "Unknown event";

  // Awaited rather than backgrounded: Coinflow allows 5 seconds, and the
  // event is the only thing this route does.
  await recordEvent({
    direction: "incoming",
    ts: Date.now(),
    label: describeWebhook(eventType),
    eventType,
    submerchantId: body.data?.merchantId,
    payload: redact(payload),
    verified,
  });

  if (!verified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (OPERATOR_INVALIDATING_EVENTS.has(eventType)) {
    // Invalidate the cached /operator render so the next nav shows the fresh
    // status. The merchant dashboard home card reads enrollment the same way,
    // so blow its cache too.
    revalidatePath("/operator");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/adora-pay");
  }

  return NextResponse.json({ received: true });
}
