import { NextResponse, type NextRequest } from "next/server";
import { FIELD_DEFINITIONS } from "@/lib/onboarding-form";
import { uploadSubmerchantFile } from "@/lib/payments/files";
import { getCurrentAccountId } from "@/lib/session";

// Proxied through the server so the browser only ever talks to this app.
export async function POST(request: NextRequest) {
  const accountId = await getCurrentAccountId();
  if (!accountId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const field = FIELD_DEFINITIONS.find(
    (definition) => definition.type === "file" && definition.name === form.get("field"),
  );
  if (!(file instanceof File) || !field)
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (field.accept && !field.accept.split(",").includes(extension))
    return NextResponse.json({ error: `${file.name} isn't an accepted file type` }, { status: 400 });
  if (field.maxSizeMb && file.size > field.maxSizeMb * 1024 * 1024)
    return NextResponse.json(
      { error: `${file.name} is larger than ${field.maxSizeMb}MB` },
      { status: 400 },
    );

  try {
    const fileKey = await uploadSubmerchantFile({ submerchantId: accountId, file });
    const safeName = file.name.replace(/[|,]/g, "_");
    return NextResponse.json({ value: `${safeName}|${fileKey}` });
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
