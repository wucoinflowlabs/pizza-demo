"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CircleIcon, RadioIcon } from "lucide-react";
import { cn } from "cn";
import { loadAdoraPaySnapshot } from "../actions";
import {
  eventsFromSnapshot,
  paySteps,
  type AdoraPaySnapshot,
  type PayWebhook,
} from "../pay-status";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function AdoraPayActivity({
  initialSnapshot,
  initialEvents,
  animate = false,
}: {
  initialSnapshot: AdoraPaySnapshot;
  initialEvents: PayWebhook[];
  /** Reveal the opening events one at a time, the way a live webhook feed arrives. */
  animate?: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [events, setEvents] = useState<PayWebhook[]>(animate ? [] : initialEvents);
  const [listening, setListening] = useState(true);

  useEffect(() => {
    if (!animate) return;
    if (events.length >= initialEvents.length) return;
    const next = initialEvents[events.length];
    const timer = setTimeout(() => setEvents((current) => [...current, next]), 700);
    return () => clearTimeout(timer);
  }, [animate, events.length, initialEvents]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await loadAdoraPaySnapshot();
        if (cancelled || !next || next.merchantId !== snapshot.merchantId) return;
        setSnapshot((current) => ({
          ...next,
          businessName: next.businessName ?? current.businessName,
        }));
        const incoming = eventsFromSnapshot(next);
        setEvents((current) => {
          const known = new Set(current.map((event) => event.id));
          const fresh = incoming.filter((event) => !known.has(event.id));
          return fresh.length ? [...current, ...fresh] : current;
        });
      } catch (err) {
        console.error("[dashboard] status poll failed", err);
        if (!cancelled) setListening(false);
      }
    };
    const timer = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [snapshot.merchantId]);

  const steps = paySteps(snapshot);
  const revealed = new Set(events.map((event) => event.type));
  const stepVisible = (id: string) => {
    if (!animate || events.length >= initialEvents.length) return true;
    if (id === "account") return revealed.has("submerchant.created");
    if (id === "details") return revealed.has("onboarding.draft.saved");
    return revealed.has("verification.updated");
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-adora-blue">Adora Pay</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-adora-navy">
            {snapshot.businessName ?? "Adora Pay"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Account {snapshot.merchantId}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map((step) => {
            const visible = stepVisible(step.id);
            return (
              <li key={step.id} className="flex items-center gap-3 text-sm">
                {visible && step.done ? (
                  <CheckIcon className="size-4 text-emerald-600" />
                ) : visible ? (
                  <RadioIcon className="size-4 text-adora-blue" />
                ) : (
                  <CircleIcon className="size-4 text-muted-foreground/40" />
                )}
                <span className={cn(!visible && "text-muted-foreground/50")}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="flex min-h-80 flex-col overflow-hidden rounded-xl bg-adora-navy text-white">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-heading text-sm font-semibold">Webhooks</h2>
          <span className="flex items-center gap-2 text-xs text-white/70">
            <span
              className={cn(
                "size-2 rounded-full",
                listening ? "animate-pulse bg-emerald-400" : "bg-white/40",
              )}
            />
            {listening ? "Listening" : "Paused"}
          </span>
        </header>
        <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 font-mono text-xs">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1">
              <span className="text-white/50">
                {formatTime(event.at)} · {event.type}
              </span>
              <span className="text-sm text-white/95">{event.summary}</span>
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-white/50">Waiting for the first event…</li>
          )}
        </ol>
      </section>
    </div>
  );
}
