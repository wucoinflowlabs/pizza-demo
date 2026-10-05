// Seeds Lamonica's staff as Coinflow withdrawers, and optionally pays them tips.
//
//   node --env-file=.env.local scripts/seed-withdrawers.mjs            # register + link payout methods
//   node --env-file=.env.local scripts/seed-withdrawers.mjs --tips     # ...then pay each approved staff member
//
// Options: --merchant <id> (default adora-lamonica-westwood), --count <n> (default 12), --tip-max <dollars> (default 2)
//
// Sandbox only. US KYC auto-approves; ssn 1111 + zip 11111 stays pending; ssn 9999 is rejected.
// Re-running is safe: staff ids are stable and existing withdrawers are reused.

import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { faker } from "@faker-js/faker";

const { values: args } = parseArgs({
  options: {
    merchant: { type: "string", default: "adora-lamonica-westwood" },
    count: { type: "string", default: "12" },
    tips: { type: "boolean", default: false },
    "tip-max": { type: "string", default: "2" },
  },
});

const BASE = (process.env.PAYMENTS_API_BASE_URL || "https://api-sandbox.coinflow.cash/api").replace(/\/+$/, "");
const KEY = process.env.PAYMENTS_API_KEY;
if (!KEY) throw new Error("PAYMENTS_API_KEY is not set. Run with --env-file=.env.local");
if (!BASE.includes("sandbox")) throw new Error(`Refusing to seed a non-sandbox API: ${BASE}`);

const ROLES = ["Server", "Server", "Server", "Bartender", "Delivery driver", "Host", "Line cook"];

async function call(method, path, { userId, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: KEY,
      "x-coinflow-submerchant-id": args.merchant,
      ...(userId ? { "x-coinflow-auth-user-id": userId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

function describe(result) {
  const detail = result.body?.details ?? result.body?.message ?? result.body;
  return `${result.status} ${typeof detail === "string" ? detail : JSON.stringify(detail)}`.slice(0, 240);
}

/** Any four digits except the sandbox's forced pending/rejected values. */
function safeSsn() {
  const ssn = faker.string.numeric(4);
  return ssn === "1111" || ssn === "9999" ? "4321" : ssn;
}

/** Stable staff: the same seed always yields the same people and user ids. */
function buildStaff(count) {
  faker.seed(20261004);
  return Array.from({ length: count }, (_, index) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    // The last two exercise the other verification outcomes.
    const outcome = index === count - 1 ? "rejected" : index === count - 2 ? "pending" : "approved";
    return {
      userId: `lamonica-${faker.helpers.slugify(`${firstName}-${lastName}`).toLowerCase()}`,
      role: ROLES[index % ROLES.length],
      outcome,
      info: {
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        firstName,
        surName: lastName,
        physicalAddress: faker.location.streetAddress(),
        city: "Los Angeles",
        state: "CA",
        zip: outcome === "pending" ? "11111" : faker.helpers.arrayElement(["90024", "90025", "90049", "90064", "90095"]),
        country: "US",
        dob: faker.date.birthdate({ min: 19, max: 55, mode: "age" }).toISOString().slice(0, 10).replace(/-/g, ""),
        ssn: outcome === "pending" ? "1111" : outcome === "rejected" ? "9999" : safeSsn(),
      },
      // Most staff take tips on Venmo; a few use PayPal, some both.
      venmoPhone: index % 4 !== 3 ? `310${faker.string.numeric(7)}` : undefined,
      paypalEmail: index % 4 === 3 || index % 5 === 0 ? faker.internet.email({ firstName, lastName, provider: "example.com" }).toLowerCase() : undefined,
    };
  });
}

async function getWithdrawer(userId) {
  const result = await call("GET", "/withdraw", { userId });
  return result.ok ? result.body?.withdrawer : undefined;
}

async function register(staff) {
  const existing = await getWithdrawer(staff.userId);
  if (existing) return existing;
  const result = await call("POST", "/withdraw/kyc", { userId: staff.userId, body: { info: staff.info } });
  if (result.ok) return result.body?.withdrawer ?? (await getWithdrawer(staff.userId));
  // 451 means extra verification is needed; the withdrawer still exists.
  if (result.status === 451) return getWithdrawer(staff.userId);
  console.log(`   ✗ KYC failed: ${describe(result)}`);
  return undefined;
}

async function linkMethods(staff, withdrawer) {
  if (staff.venmoPhone && !withdrawer.venmo?.token) {
    const result = await call("POST", "/withdraw/venmo", { userId: staff.userId, body: { phoneNumber: staff.venmoPhone } });
    console.log(result.ok ? "   ✓ Venmo linked" : `   ✗ Venmo failed: ${describe(result)}`);
  }
  if (staff.paypalEmail && !withdrawer.paypal?.token) {
    const result = await call("POST", "/withdraw/paypal", { userId: staff.userId, body: { email: staff.paypalEmail } });
    console.log(result.ok ? "   ✓ PayPal linked" : `   ✗ PayPal failed: ${describe(result)}`);
  }
  return getWithdrawer(staff.userId);
}

async function payTip(staff, withdrawer, maxCents) {
  const method = withdrawer.venmo?.token
    ? { speed: "venmo", account: withdrawer.venmo.token }
    : withdrawer.paypal?.token
      ? { speed: "paypal", account: withdrawer.paypal.token }
      : undefined;
  if (!method) return 0;

  const cents = faker.number.int({ min: Math.min(100, maxCents), max: maxCents });
  const result = await call("POST", "/merchant/withdraws/payout/delegated", {
    body: {
      userId: staff.userId,
      amount: { cents, currency: "USD" },
      ...method,
      idempotencyKey: randomUUID(),
      waitForConfirmation: true,
    },
  });
  if (!result.ok) {
    console.log(`   ✗ Tip payout failed: ${describe(result)}`);
    return 0;
  }
  console.log(`   ✓ Paid $${(cents / 100).toFixed(2)} tips via ${method.speed}`);
  return cents;
}

const staff = buildStaff(Number(args.count));
console.log(`Seeding ${staff.length} staff as withdrawers under ${args.merchant} (${BASE})\n`);

const approved = [];
for (const member of staff) {
  console.log(`• ${member.info.firstName} ${member.info.surName} (${member.role}) — ${member.userId}`);
  const withdrawer = await register(member);
  if (!withdrawer) continue;
  const status = withdrawer.verification?.status ?? "unknown";
  console.log(`   ✓ Withdrawer ${withdrawer._id ?? ""} · verification ${status}`);
  if (status !== "approved") continue;
  approved.push({ member, withdrawer: await linkMethods(member, withdrawer) });
}

if (args.tips) {
  const balance = await call("GET", "/merchant/withdraws/payout/balance");
  let remaining = balance.body?.balance?.cents ?? 0;
  const tipMax = Math.round(Number(args["tip-max"]) * 100);
  console.log(`\nPaying tips from a $${(remaining / 100).toFixed(2)} payout balance (max $${(tipMax / 100).toFixed(2)} each)`);
  for (const { member, withdrawer } of approved) {
    if (remaining < 100) {
      console.log("Balance too low for more tips. Fund the sub-merchant's wallet with the sandbox faucet and re-run with --tips.");
      break;
    }
    console.log(`• ${member.info.firstName} ${member.info.surName}`);
    remaining -= await payTip(member, withdrawer, Math.min(tipMax, remaining));
  }
}

console.log("\nDone.");
