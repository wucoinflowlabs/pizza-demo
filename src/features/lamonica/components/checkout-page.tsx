"use client";

import {
  ChargebackProtectionAccountType,
  CoinflowPurchase,
  Currency,
  MerchantStyle,
  PaymentMethods,
} from "@coinflowlabs/react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useCart } from "@/features/lamonica/cart";
import {
  LAMONICA_MERCHANT_ID,
  SHOP,
  findMenuItem,
  money,
  type LamonicaCoinflowEnv,
} from "@/features/lamonica/menu";
import { createLamonicaSessionKey } from "@/features/lamonica/session-key";

const PAYMENT_METHODS = [
  PaymentMethods.card,
  PaymentMethods.applePay,
  PaymentMethods.googlePay,
  PaymentMethods.cashApp,
  PaymentMethods.venmo,
  PaymentMethods.paypal,
];

type Fulfillment = "pickup" | "delivery";

type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fulfillment: Fulfillment;
  address: string;
};

type FieldErrors = Partial<Record<keyof Customer, string>>;

const EMPTY_CUSTOMER: Customer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  fulfillment: "pickup",
  address: "",
};

type PaidOrder = {
  paymentId: string;
  orderId: string;
  fulfillment: Fulfillment;
  address: string;
  totalCents: number;
};

export function CheckoutPage({ env }: { env: LamonicaCoinflowEnv }) {
  const cart = useCart();
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<"details" | "pay">("details");
  const [sessionKey, setSessionKey] = useState<string>();
  const [keyError, setKeyError] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [orderId, setOrderId] = useState<string>();
  const [customerId, setCustomerId] = useState<string>();
  const [declined, setDeclined] = useState<string>();
  const [paid, setPaid] = useState<PaidOrder>();
  const [frameHeight, setFrameHeight] = useState(680);

  const handleHeight = useCallback((next: string) => {
    const height = Number(next);
    if (Number.isFinite(height) && height > 0) setFrameHeight(height);
  }, []);

  async function startPayment() {
    const nextErrors = validateCustomer(customer);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || cart.totals.totalCents < 50) return;

    const id = customerId ?? guestId();
    setCustomerId(id);
    setOrderId((current) => current ?? `LM${Date.now().toString(36).toUpperCase()}`);
    setDeclined(undefined);
    setKeyError(undefined);
    setStep("pay");
    if (sessionKey) return;

    setStarting(true);
    const result = await createLamonicaSessionKey(id);
    setStarting(false);
    if ("sessionKey" in result) setSessionKey(result.sessionKey);
    else setKeyError(result.error);
  }

  if (paid) {
    return (
      <Confirmation
        paid={paid}
        onAnother={() => {
          setPaid(undefined);
          setStep("details");
          setSessionKey(undefined);
          setOrderId(undefined);
          setCustomer(EMPTY_CUSTOMER);
        }}
      />
    );
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-[#181848]/70">Add something from the menu, then come back to pay.</p>
        <Link
          href="/lamonica"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-[#181848] px-5 font-semibold text-[#FFF6E2]"
        >
          Back to the menu
        </Link>
      </div>
    );
  }

  const lines = cart.lines.flatMap((line) => {
    const item = findMenuItem(line.id);
    return item ? [{ ...line, item }] : [];
  });

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[320px_1fr] lg:items-start lg:py-12">
      <aside className="rounded-3xl bg-white p-5 ring-1 ring-[#181848]/10 lg:sticky lg:top-28">
        <h1 className="font-heading text-xl font-bold">Your order</h1>
        {!cart.ready ? (
          <p className="mt-3 text-sm text-[#181848]/70">Loading your order…</p>
        ) : (
          <>
            <ul className="mt-4 space-y-2 text-sm">
              {lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3">
                  <span>
                    {line.qty} × {line.item.name}
                  </span>
                  <span className="tabular-nums">{money(line.item.priceCents * line.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-[#181848]/10 pt-4 text-sm">
              <Row label="Subtotal" value={money(cart.totals.subtotalCents)} />
              <Row label="Tax" value={money(cart.totals.taxCents)} />
              <div className="flex justify-between pt-1 font-heading text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(cart.totals.totalCents)}</dd>
              </div>
            </dl>
            <Link href="/lamonica" className="mt-4 inline-block text-sm font-semibold underline">
              Edit order
            </Link>
          </>
        )}
      </aside>

      {step === "details" ? (
        <form
          className="rounded-3xl bg-white p-5 ring-1 ring-[#181848]/10 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void startPayment();
          }}
        >
          <h2 className="font-heading text-2xl font-bold">Where should it go?</h2>
          <p className="mt-1 text-sm text-[#181848]/70">
            Pickup is at {SHOP.address}. Delivery stays in Westwood.
          </p>
          <fieldset className="mt-5 flex gap-2">
            {(["pickup", "delivery"] as const).map((option) => (
              <label
                key={option}
                className={`flex-1 cursor-pointer rounded-2xl border px-3 py-3 text-center text-sm font-semibold ${
                  customer.fulfillment === option
                    ? "border-[#181848] bg-[#181848] text-[#FFF6E2]"
                    : "border-[#181848]/15"
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value={option}
                  checked={customer.fulfillment === option}
                  onChange={() => setCustomer((current) => ({ ...current, fulfillment: option }))}
                  className="sr-only"
                />
                {option === "pickup" ? "Pickup" : "Delivery"}
              </label>
            ))}
          </fieldset>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              value={customer.firstName}
              error={errors.firstName}
              autoComplete="given-name"
              onChange={(firstName) => setCustomer((current) => ({ ...current, firstName }))}
            />
            <Field
              label="Last name"
              value={customer.lastName}
              error={errors.lastName}
              autoComplete="family-name"
              onChange={(lastName) => setCustomer((current) => ({ ...current, lastName }))}
            />
            <Field
              label="Email"
              type="email"
              value={customer.email}
              error={errors.email}
              autoComplete="email"
              onChange={(email) => setCustomer((current) => ({ ...current, email }))}
            />
            <Field
              label="Phone"
              type="tel"
              value={customer.phone}
              error={errors.phone}
              autoComplete="tel"
              onChange={(phone) => setCustomer((current) => ({ ...current, phone }))}
            />
          </div>
          {customer.fulfillment === "delivery" && (
            <div className="mt-4">
              <Field
                label="Delivery address"
                value={customer.address}
                error={errors.address}
                autoComplete="street-address"
                onChange={(address) => setCustomer((current) => ({ ...current, address }))}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={!cart.ready || starting}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#F0A020] font-semibold text-[#181848] disabled:opacity-60"
          >
            Continue to payment
          </button>
        </form>
      ) : (
        <section className="min-w-0">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold">Payment</h2>
              <p className="mt-1 text-sm text-[#181848]/70">
                {customer.fulfillment === "pickup" ? "Pickup" : "Delivery"} for {customer.firstName}{" "}
                {customer.lastName}. Card processing is added below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="text-sm font-semibold underline"
            >
              Edit details
            </button>
          </div>
          {declined && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{declined}</p>
          )}
          {keyError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>{keyError}</p>
              <button type="button" onClick={() => void startPayment()} className="mt-2 font-semibold underline">
                Try again
              </button>
            </div>
          )}
          {starting && <p className="text-sm text-[#181848]/70">Opening checkout…</p>}
          {sessionKey && orderId && (
            <div
              className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#181848]/10"
              style={{ height: frameHeight }}
            >
              <CoinflowPurchase
                sessionKey={sessionKey}
                merchantId={LAMONICA_MERCHANT_ID}
                env={env}
                subtotal={{ cents: cart.totals.totalCents, currency: Currency.USD }}
                allowedPaymentMethods={PAYMENT_METHODS}
                email={customer.email.trim()}
                supportEmail={SHOP.email}
                loaderBackground="#ffffff"
                theme={{
                  font: "Inter",
                  style: MerchantStyle.Rounded,
                  primary: "#181848",
                  background: "#ffffff",
                  textColor: "#181848",
                  ctaColor: "#181848",
                }}
                customerInfo={{
                  firstName: customer.firstName.trim(),
                  lastName: customer.lastName.trim(),
                  email: customer.email.trim(),
                  ...(customer.fulfillment === "delivery"
                    ? {
                        address: customer.address.trim(),
                        city: "Los Angeles",
                        state: "CA",
                        zip: "90024",
                        country: "US",
                      }
                    : {}),
                }}
                chargebackProtectionAccountType={ChargebackProtectionAccountType.GUEST}
                chargebackProtectionData={lines.map((line) => ({
                  productName: line.item.name,
                  productType: "inGameProduct",
                  quantity: line.qty,
                  rawProductData: {
                    sku: line.item.id,
                    description: line.item.description,
                  },
                }))}
                webhookInfo={{
                  orderId,
                  shop: SHOP.name,
                  fulfillment: customer.fulfillment,
                  phone: customer.phone.trim(),
                  address:
                    customer.fulfillment === "delivery" ? customer.address.trim() : SHOP.address,
                  items: lines.map((line) => ({
                    sku: line.item.id,
                    name: line.item.name,
                    qty: line.qty,
                    cents: line.item.priceCents,
                  })),
                }}
                handleHeightChange={handleHeight}
                onSuccess={(result) => {
                  const paymentId = typeof result === "string" ? result : result.paymentId;
                  setPaid({
                    paymentId,
                    orderId,
                    fulfillment: customer.fulfillment,
                    address: customer.address.trim(),
                    totalCents: cart.totals.totalCents,
                  });
                  cart.clear();
                }}
                onAuthDeclined={(info) => setDeclined(info.message || "The payment was declined.")}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Confirmation({ paid, onAnother }: { paid: PaidOrder; onAnother: () => void }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#181848]/60 uppercase">Paid</p>
      <h1 className="mt-2 font-heading text-4xl font-bold">You&apos;re on the board.</h1>
      <p className="mt-3 text-[#181848]/80">
        Order {paid.orderId} is in for {money(paid.totalCents)}.{" "}
        {paid.fulfillment === "pickup"
          ? `We'll have it at ${SHOP.address}.`
          : `We're sending it to ${paid.address}.`}
      </p>
      <p className="mt-4 text-xs text-[#181848]/50">Payment {paid.paymentId}</p>
      <Link
        href="/lamonica"
        onClick={onAnother}
        className="mt-8 inline-flex h-11 items-center rounded-full bg-[#181848] px-5 font-semibold text-[#FFF6E2]"
      >
        Order something else
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#181848]/70">
      <dt>{label}</dt>
      <dd className="tabular-nums text-[#181848]">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <label htmlFor={id} className="block text-sm font-semibold">
      {label}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="mt-1 h-11 w-full rounded-xl border border-[#181848]/15 bg-[#FFF6E2] px-3 font-normal outline-none focus:border-[#181848]"
      />
      {error && <span className="mt-1 block font-normal text-red-700">{error}</span>}
    </label>
  );
}

function validateCustomer(customer: Customer): FieldErrors {
  const errors: FieldErrors = {};
  if (!customer.firstName.trim()) errors.firstName = "Enter a first name.";
  if (!customer.lastName.trim()) errors.lastName = "Enter a last name.";
  if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) errors.email = "Enter a valid email.";
  if (customer.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a 10-digit phone number.";
  if (customer.fulfillment === "delivery" && customer.address.trim().length < 5) {
    errors.address = "Enter a delivery address.";
  }
  return errors;
}

function guestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `guest_${hex}`;
}
