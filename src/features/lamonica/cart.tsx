"use client";

import { useSyncExternalStore } from "react";
import { findMenuItem, orderTotals } from "./menu";

const STORAGE_KEY = "lamonica-cart";
const MAX_QTY = 20;
const EMPTY: CartLine[] = [];

export type CartLine = { id: string; qty: number };

let lines: CartLine[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function loadLines(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.flatMap((line) => {
      if (!line || typeof line !== "object") return [];
      const id = "id" in line && typeof line.id === "string" ? line.id : "";
      const qty = "qty" in line && typeof line.qty === "number" ? line.qty : 0;
      if (!findMenuItem(id) || qty < 1) return [];
      return [{ id, qty: Math.min(MAX_QTY, Math.floor(qty)) }];
    });
  } catch {
    return EMPTY;
  }
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  lines = loadLines();
}

function emit() {
  for (const listener of listeners) listener();
}

function update(next: CartLine[]) {
  lines = next;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getLines() {
  ensureHydrated();
  return lines;
}

function getReady() {
  return hydrated;
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, getLines, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, getReady, () => false);
  const count = current.reduce((sum, line) => sum + line.qty, 0);

  return {
    ready,
    lines: current,
    count,
    totals: orderTotals(current),
    add,
    setQty,
    clear,
  };
}

function add(id: string) {
  if (!findMenuItem(id)) return;
  ensureHydrated();
  const existing = lines.find((line) => line.id === id);
  if (!existing) {
    update([...lines, { id, qty: 1 }]);
    return;
  }
  update(
    lines.map((line) =>
      line.id === id ? { ...line, qty: Math.min(MAX_QTY, line.qty + 1) } : line,
    ),
  );
}

function setQty(id: string, qty: number) {
  ensureHydrated();
  if (qty < 1) {
    update(lines.filter((line) => line.id !== id));
    return;
  }
  update(
    lines.map((line) =>
      line.id === id ? { ...line, qty: Math.min(MAX_QTY, Math.floor(qty)) } : line,
    ),
  );
}

function clear() {
  update([]);
}
