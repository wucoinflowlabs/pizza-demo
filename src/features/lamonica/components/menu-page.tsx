"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/features/lamonica/cart";
import { MENU, MENU_SECTIONS, SHOP, findMenuItem, money } from "@/features/lamonica/menu";

export function MenuPage() {
  const cart = useCart();

  return (
    <>
      <section className="bg-[#40321D] text-[#F5ECDC]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:py-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#FFBF00] uppercase">
              Downtown Davis · A short ride from UC Davis
            </p>
            <h1 className="mt-3 font-heading text-5xl font-bold tracking-tight text-balance sm:text-6xl">
              Legendary pizza, on G Street.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#F5ECDC]/80">
              Whole pies for the apartment and late slices after the game. Pickup at {SHOP.address},
              or delivery to the dorms and around town.
            </p>
            <a
              href="#menu"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-[#FFA400] px-5 font-semibold text-[#40321D]"
            >
              See the menu
            </a>
          </div>
          <Image
            src="/shops/woodstocks.png"
            alt="Woodstock's Pizza"
            width={650}
            height={314}
            priority
            className="mx-auto w-full max-w-sm"
          />
        </div>
        <div className="h-2 bg-[#022851]" />
        <div className="h-2 bg-[#FFBF00]" />
      </section>

      <section className="border-b border-[#022851]/15 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-3">
          {CAMPUS.map((note) => (
            <div key={note.title}>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#022851] uppercase">
                {note.kicker}
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">{note.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#40321D]/70">{note.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div id="menu" className="scroll-mt-28">
          {MENU_SECTIONS.map((section) => (
            <section key={section} className="mb-10">
              <h2 className="font-heading text-2xl font-bold tracking-tight">
                {section}
                <span
                  className={`mt-2 block h-1 w-12 ${
                    section === "Campus favorites" ? "bg-[#022851]" : "bg-[#FFA400]"
                  }`}
                />
              </h2>
              <ul>
                {MENU.filter((item) => item.section === section).map((item) => {
                  const qty = cart.lines.find((line) => line.id === item.id)?.qty ?? 0;
                  if (item.compareAtCents) {
                    return (
                      <li key={item.id} className="py-4">
                        <div className="flex flex-col gap-4 rounded-3xl bg-[#022851] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#FFBF00] uppercase">
                              Combo · Save {money(item.compareAtCents - item.priceCents)}
                            </p>
                            <h3 className="mt-1 font-heading text-2xl font-bold">{item.name}</h3>
                            <p className="mt-1 max-w-md text-sm leading-relaxed text-white/80">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end">
                            <p className="font-heading text-2xl font-bold tabular-nums">
                              {money(item.priceCents)}
                              <span className="ml-2 text-base font-semibold text-white/60 line-through">
                                {money(item.compareAtCents)}
                              </span>
                            </p>
                            {qty > 0 ? (
                              <QtyControl
                                qty={qty}
                                label={item.name}
                                onDec={() => cart.setQty(item.id, qty - 1)}
                                onInc={() => cart.add(item.id)}
                                light
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => cart.add(item.id)}
                                className="rounded-full bg-[#FFBF00] px-4 py-2 text-sm font-semibold text-[#40321D]"
                              >
                                Add combo
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 border-b border-[#40321D]/10 py-4"
                    >
                      <div>
                        <h3 className="font-heading text-lg font-semibold">{item.name}</h3>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-[#40321D]/70">
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
                            className="rounded-full bg-[#40321D] px-3 py-1.5 text-sm font-semibold text-[#F5ECDC]"
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

const CAMPUS = [
  {
    kicker: "Bike right up",
    title: "A short ride from campus",
    body: "G Street is a quick pedal from the Quad. Most orders are ready before you lock up your bike.",
  },
  {
    kicker: "Game day",
    title: "Game Day Combo",
    body: "The Aggie Pack, Aggie knots, and four sodas, packed before kickoff. Pickup at the counter, or we run it out to the dorms.",
  },
  {
    kicker: "Open until 2",
    title: "After the library",
    body: "Slices stay on the counter past midnight. Ask for the Aggie if the case looks picked over.",
  },
];

function QtyControl({
  qty,
  label,
  onDec,
  onInc,
  light = false,
}: {
  qty: number;
  label: string;
  onDec: () => void;
  onInc: () => void;
  light?: boolean;
}) {
  return (
    <div
      className={`flex items-center rounded-full border bg-white ${
        light ? "border-white/30 text-[#40321D]" : "border-[#40321D]/15"
      }`}
    >
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
      className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#40321D]/10 lg:sticky lg:top-28"
    >
      <h2 className="font-heading text-xl font-bold">Your order</h2>
      {!cart.ready || cart.lines.length === 0 ? (
        <p className="mt-3 text-sm text-[#40321D]/70">
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
          <dl className="mt-4 space-y-1 border-t border-[#40321D]/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#40321D]/70">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#40321D]/70">Tax</dt>
              <dd className="tabular-nums">{money(taxCents)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-heading text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(totalCents)}</dd>
            </div>
          </dl>
          <Link
            href="/woodstock-pizza/checkout"
            className="mt-4 flex h-11 items-center justify-center rounded-full bg-[#FFA400] font-semibold text-[#40321D]"
          >
            Checkout
          </Link>
        </>
      )}
    </aside>
  );
}
