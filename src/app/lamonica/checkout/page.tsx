import { lamonicaCheckoutEnv } from "@/features/lamonica/checkout-env";
import { CheckoutLoader } from "@/features/lamonica/components/checkout-loader";

export default function Page() {
  return <CheckoutLoader env={lamonicaCheckoutEnv()} />;
}
