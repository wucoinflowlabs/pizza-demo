import { NextResponse, type NextRequest } from "next/server";
import { MAX_EVIDENCE_MB } from "@/features/dashboard/evidence";
import { resolvePaymentSubmerchant } from "@/features/dashboard/session-submerchant";
import { uploadSubmerchantFile } from "@/lib/payments/files";

/**
 * Uploads a chargeback evidence PDF to the store's Coinflow file storage and returns
 * its key for `respondToChargebackAction`. Proxied through the server so the browser
 * only ever talks to this app, and because server actions cap request bodies at 1MB.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const location = form.get("location");
  const submerchantId = await resolvePaymentSubmerchant(typeof location === "string" ? location : undefined);
  if (!submerchantId) return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ error: `${file.name} isn't a PDF.` }, { status: 400 });
  if (file.size > MAX_EVIDENCE_MB * 1024 * 1024)
    return NextResponse.json({ error: `${file.name} is larger than ${MAX_EVIDENCE_MB}MB.` }, { status: 400 });

  try {
    const pdf = file.type === "application/pdf" ? file : new File([file], file.name, { type: "application/pdf" });
    const fileKey = await uploadSubmerchantFile({ submerchantId, file: pdf });
    return NextResponse.json({ fileKey });
  } catch (err) {
    console.error("[dashboard] evidence upload failed", err);
    return NextResponse.json({ error: "The PDF couldn't be uploaded. Please try again." }, { status: 502 });
  }
}
