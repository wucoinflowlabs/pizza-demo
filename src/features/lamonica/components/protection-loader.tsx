"use client";

import dynamic from "next/dynamic";
import type { LamonicaCoinflowEnv } from "@/features/lamonica/menu";

const LamonicaProtection = dynamic(
  () => import("./protection").then((mod) => mod.LamonicaProtection),
  { ssr: false },
);

export function ProtectionLoader({ env }: { env: LamonicaCoinflowEnv }) {
  return <LamonicaProtection env={env} />;
}
