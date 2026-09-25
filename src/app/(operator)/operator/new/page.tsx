import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewApplicationForm } from "@/features/operator/components/new-application-form";
import { isOperator } from "@/lib/session";

export const metadata: Metadata = { title: "Onboard a business" };

export default async function NewApplicationPage() {
  if (!(await isOperator())) redirect("/operator");
  return (
    <div className="mx-auto w-full max-w-3xl">
      <NewApplicationForm />
    </div>
  );
}
