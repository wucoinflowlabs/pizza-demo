"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/features/lamonica/cart";
import { MENU, MENU_SECTIONS, SHOP, findMenuItem, money } from "@/features/lamonica/menu";

export function MenuPage() {
  const cart = useCart();

  return (
    <>
      <section className="bg-[#181848] text-[#FFF6E2]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:py-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#F0A020] uppercase">
              Since the neighborhood got hungry
            </p>
            <h1 className="mt-3 font-heading text-5xl font-bold tracking-tight text-balance sm:text-6xl">
              New York pizza, on Gayley.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#FFF6E2]/80">
              Whole pies and late slices from {SHOP.address}. Order for pickup at the counter, or
              delivery around Westwood.
            </p>
            <a
              href="#menu"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-[#F0A020] px-5 font-semibold text-[#181848]"
            >
              See the menu
            </a>
          </div>
          <Image
            src="/shops/lamonicas.png"
            alt="Lamonica's NY Pizza"
            width={440}
            height={232}
            priority
            className="mx-auto w-full max-w-sm"
          />
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div id="menu" className="scroll-mt-28">
          {MENU_SECTIONS.map((section) => (
            <section key={section} className="mb-10">
              <h2 className="font-heading text-2xl font-bold tracking-tight">
                {section}
                <span className="mt-2 block h-1 w-12 bg-[#F0A020]" />
              </h2>
              <ul>
                {MENU.filter((item) => item.section === section).map((item) => {
                  const qty = cart.lines.find((line) => line.id === item.id)?.qty ?? 0;
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 border-b border-[#181848]/10 py-4"
                    >
                      <div>
                        <h3 className="font-heading text-lg font-semibold">{item.name}</h3>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-[#181848]/70">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="font-semibold tabular-nums">{money(item.priceCents)}</p>
                        {qty > 0 ? (
                          <QtyControl
                            qty={qty}
                            label={item.name}
                            onDec={() => cart.setQty(item.id, qty - 1)}
                            onInc={() => cart.add(item.id)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => cart.add(item.id)}
                            className="rounded-full bg-[#181848] px-3 py-1.5 text-sm font-semibold text-[#FFF6E2]"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <CartPanel />
      </div>
    </>
  );
}

function QtyControl({
  qty,
  label,
  onDec,
  onInc,
}: {
  qty: number;
  label: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-[#181848]/15 bg-white">
      <button
        type="button"
        aria-label={`Remove one ${label}`}
        onClick={onDec}
        className="size-8 text-lg leading-none"
      >
        −
      </button>
      <span className="min-w-5 text-center text-sm font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label={`Add another ${label}`}
        onClick={onInc}
        className="size-8 text-lg leading-none"
      >
        +
      </button>
    </div>
  );
}

function CartPanel() {
  const cart = useCart();
  const { subtotalCents, taxCents, totalCents } = cart.totals;

  return (
    <aside
      id="cart"
      className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#181848]/10 lg:sticky lg:top-28"
    >
      <h2 className="font-heading text-xl font-bold">Your order</h2>
      {!cart.ready || cart.lines.length === 0 ? (
        <p className="mt-3 text-sm text-[#181848]/70">
          {cart.ready ? "Add a slice or a pie to get started." : "Loading your order…"}
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {cart.lines.map((line) => {
              const item = findMenuItem(line.id);
              if (!item) return null;
              return (
                <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold">
                      {line.qty} × {item.name}
                    </p>
                    <QtyControl
                      qty={line.qty}
                      label={item.name}
                      onDec={() => cart.setQty(line.id, line.qty - 1)}
                      onInc={() => cart.add(line.id)}
                    />
                  </div>
                  <p className="tabular-nums">{money(item.priceCents * line.qty)}</p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-[#181848]/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#181848]/70">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#181848]/70">Tax</dt>
              <dd className="tabular-nums">{money(taxCents)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-heading text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(totalCents)}</dd>
            </div>
          </dl>
          <Link
            href="/lamonica/checkout"
            className="mt-4 flex h-11 items-center justify-center rounded-full bg-[#F0A020] font-semibold text-[#181848]"
          >
            Checkout
          </Link>
        </>
      )}
    </aside>
  );
}
