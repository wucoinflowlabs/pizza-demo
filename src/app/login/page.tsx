import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantSignIn } from "@/features/dashboard/components/merchant-sign-in";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Merchant login" };

function prefilledEmail(value: string | string[] | undefined) {
  const email = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!email || !email.includes("@")) return undefined;
  return email;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const email = await getCurrentMerchantEmail();
  if (email && (await getMerchantLogin(email))) redirect("/dashboard");

  const { email: requestedEmail } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16">
      <MerchantSignIn defaultEmail={prefilledEmail(requestedEmail)} />
    </div>
  );
}
