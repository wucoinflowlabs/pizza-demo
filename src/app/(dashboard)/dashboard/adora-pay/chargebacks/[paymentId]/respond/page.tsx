import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { toChargeback, type Chargeback } from "@/features/dashboard/chargebacks";
import { DisputeResponse } from "@/features/dashboard/components/dispute-response";
import { getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { DEFAULT_TIME_ZONE, shopTimeZone } from "@/features/dashboard/load-payments-series";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { getChargeback, getChargebackDraft } from "@/lib/payments/chargebacks";
import { PaymentsError } from "@/lib/payments/errors";
import type { OrderLocation } from "@/features/dashboard/orders";

export const metadata: Metadata = { title: "Dispute chargeback" };

const CHARGEBACKS_PATH = "/dashboard/adora-pay/chargebacks";

/** The store whose sub-merchant owns the chargeback, as the signed-in account sees it. */
async function resolveStore(locationParam: unknown) {
  const franchise = await getSessionFranchise();
  if (franchise) {
    // A franchise owner has to name one of their own enrolled stores.
    const location = parseLocation(locationParam, franchise.locations);
    if (!location) redirect(CHARGEBACKS_PATH);
    const store: OrderLocation = { id: location.id, label: location.label, city: location.city };
    return { submerchantId: location.submerchantId, timeZone: DEFAULT_TIME_ZONE, location: store };
  }

  const session = await getSessionSubmerchant();
  if (!session) redirect("/operator");
  if (!session.submerchantId) redirect("/dashboard/adora-pay");
  return { submerchantId: session.submerchantId, timeZone: await shopTimeZone(session.login.id) };
}

async function loadChargeback(submerchantId: string, paymentId: string) {
  try {
    const [detail, draft] = await Promise.all([
      getChargeback(submerchantId, paymentId),
      // A missing draft shouldn't stop the merchant from responding.
      getChargebackDraft(submerchantId, paymentId).catch((err) => {
        console.error("[dashboard] chargeback draft could not be loaded", err);
        return "";
      }),
    ]);
    if (!detail?.chargeback) return { ok: false as const, message: "This chargeback couldn't be found." };
    const payment = detail.payment ?? (detail.chargeback.payment as Parameters<typeof toChargeback>[0]["payment"]);
    return { ok: true as const, chargeback: toChargeback({ ...detail.chargeback, payment }), draft };
  } catch (err) {
    console.error("[dashboard] chargeback could not be loaded", err);
    const message =
      err instanceof PaymentsError && err.code === "NOT_FOUND"
        ? "This chargeback couldn't be found."
        : "This chargeback couldn't be loaded right now.";
    return { ok: false as const, message };
  }
}

function Notice({ backHref, title, children }: { backHref: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to chargebacks
      </Link>
      <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-foreground/10">
        <h1 className="font-heading text-xl font-semibold text-shop-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function closedMessage(chargeback: Chargeback) {
  if (chargeback.status === "Under Review") return "A response was already submitted and is with the card network.";
  if (chargeback.status === "Accepted") return "This chargeback was accepted, so it can't be disputed.";
  return "This chargeback has been decided, so it can't be disputed.";
}

export default async function RespondToChargebackPage({
  params,
  searchParams,
}: PageProps<"/dashboard/adora-pay/chargebacks/[paymentId]/respond">) {
  const { paymentId } = await params;
  const query = await searchParams;
  const store = await resolveStore(query.location);
  const backHref = `${CHARGEBACKS_PATH}?${new URLSearchParams({ chargeback: paymentId }).toString()}`;
  const result = await loadChargeback(store.submerchantId, paymentId);

  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        {!result.ok ? (
          <Notice backHref={backHref} title="Dispute chargeback">
            {result.message}
          </Notice>
        ) : result.chargeback.status !== "Needs Response" ? (
          <Notice backHref={backHref} title="This chargeback is closed to responses">
            {closedMessage(result.chargeback)}
          </Notice>
        ) : (
          <DisputeResponse
            chargeback={{ ...result.chargeback, location: "location" in store ? store.location : undefined }}
            initialDraft={result.draft}
            timeZone={store.timeZone}
            backHref={backHref}
          />
        )}
      </div>
    </div>
  );
}
