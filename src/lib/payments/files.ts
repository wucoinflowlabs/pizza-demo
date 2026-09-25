import "server-only";
import { paymentsRequest } from "./client";
import { PaymentsError } from "./errors";

const UPLOAD_TIMEOUT_MS = 60_000;

/** Uploads a document to the sub-merchant's file store and returns its key. */
export async function uploadSubmerchantFile({
  submerchantId,
  file,
}: {
  submerchantId: string;
  file: File;
}): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const { uploadUrl, fileKey } = await paymentsRequest<{
    uploadUrl: string;
    fileKey: string;
  }>({
    method: "POST",
    path: "/merchant/files/upload-url",
    body: { fileName: file.name, contentType },
    asSubmerchant: submerchantId,
  });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: Buffer.from(await file.arrayBuffer()),
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  if (!response.ok) {
    console.error(`[payments] file upload failed with ${response.status}`);
    throw new PaymentsError({ code: "UNKNOWN", detail: "file upload failed" });
  }
  return fileKey;
}
