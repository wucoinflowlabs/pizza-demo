import type { Metadata } from "next";
import { lamonicaCheckoutEnv } from "@/features/lamonica/checkout-env";
import { ProtectionLoader } from "@/features/lamonica/components/protection-loader";
import { ShopShell } from "@/features/lamonica/components/shop-shell";

export const metadata: Metadata = {
  title: { absolute: "Lamonica's NY Pizza" },
  description: "Order New York pizza from Lamonica's in Westwood. Pickup on Gayley or delivery nearby.",
};

export default function LamonicaLayout({ children }: LayoutProps<"/lamonica">) {
  return (
    <ShopShell>
      <ProtectionLoader env={lamonicaCheckoutEnv()} />
      {children}
    </ShopShell>
  );
}
