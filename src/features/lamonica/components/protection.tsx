"use client";

import { CoinflowPurchaseProtection } from "@coinflowlabs/react";
import { LAMONICA_MERCHANT_ID, type LamonicaCoinflowEnv } from "@/features/lamonica/menu";

export function LamonicaProtection({ env }: { env: LamonicaCoinflowEnv }) {
  return <CoinflowPurchaseProtection merchantId={LAMONICA_MERCHANT_ID} coinflowEnv={env} />;
}
