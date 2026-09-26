import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantSignIn } from "@/features/dashboard/components/merchant-sign-in";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Merchant login" };

export default async function LoginPage() {
  const email = await getCurrentMerchantEmail();
  if (email && (await getMerchantLogin(email))) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16">
      <MerchantSignIn />
    </div>
  );
}
