import type { Metadata } from "next";
import { lamonicaCheckoutEnv } from "@/features/lamonica/checkout-env";
import { ProtectionLoader } from "@/features/lamonica/components/protection-loader";
import { ShopShell } from "@/features/lamonica/components/shop-shell";

export const metadata: Metadata = {
  title: { absolute: "Woodstock's Pizza Davis" },
  description: "Order pizza from Woodstock's in downtown Davis. Pickup on G Street or delivery nearby.",
};

export default function WoodstockPizzaLayout({ children }: LayoutProps<"/woodstock-pizza">) {
  return (
    <ShopShell>
      <ProtectionLoader env={lamonicaCheckoutEnv()} />
      {children}
    </ShopShell>
  );
}
