"use client";

import dynamic from "next/dynamic";
import type { LamonicaCoinflowEnv } from "@/features/lamonica/menu";

const CheckoutPage = dynamic(
  () => import("./checkout-page").then((mod) => mod.CheckoutPage),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-16 text-center text-sm text-[#40321D]/70">Loading checkout…</p>
    ),
  },
);

export function CheckoutLoader({ env }: { env: LamonicaCoinflowEnv }) {
  return <CheckoutPage env={env} />;
}
