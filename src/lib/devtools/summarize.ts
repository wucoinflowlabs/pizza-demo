type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Full merchant records carry wallet material, staff users and account
 * settings, so the panel only ever sees the fields this app actually reads.
 */
function isMerchantRecord(value: unknown): value is Json {
  return isObject(value) && typeof value.merchantId === "string" && Object.keys(value).length > 8;
}

function summarizeMerchant(merchant: Json) {
  const users = Array.isArray(merchant.users) ? (merchant.users as Json[]) : [];
  const verification = isObject(merchant.verification) ? merchant.verification : undefined;
  const settlement = isObject(merchant.settlementAddresses)
    ? Object.fromEntries(
        Object.entries(merchant.settlementAddresses).filter(
          ([, address]) => typeof address === "string" && address.length > 0,
        ),
      )
    : undefined;

  const summary: Json = {
    merchantId: merchant.merchantId,
    dba: merchant.dba,
    email: users[0]?.email ?? merchant.email,
    blocked: merchant.blocked ?? false,
    verification: verification && { status: verification.status, vendor: verification.vendor },
    goLiveChecklist: merchant.goLiveChecklist,
    settlementAddresses: settlement,
  };
  const shown = Object.fromEntries(Object.entries(summary).filter(([, v]) => v !== undefined));
  return { ...shown, "…": `${Object.keys(merchant).length} fields, trimmed for display` };
}

function summarizeLinks(links: unknown) {
  if (!isObject(links)) return links;
  return {
    merchantLink: links.merchantLink ? "(Persona business inquiry)" : undefined,
    uboLinks: Array.isArray(links.uboLinks)
      ? links.uboLinks.map((ubo: Json) => ({ name: ubo.name, vendor: ubo.vendor }))
      : undefined,
  };
}

function summarizeValue(value: unknown): unknown {
  if (isMerchantRecord(value)) return summarizeMerchant(value);
  if (Array.isArray(value) && value.some(isMerchantRecord))
    return value.map((item) => (isMerchantRecord(item) ? summarizeMerchant(item) : item));
  return value;
}

/** Trims merchant records, at the top level or one level down, to what the app uses. */
export function summarizeResponse(body: unknown): unknown {
  if (!isObject(body)) return summarizeValue(body);
  if (isMerchantRecord(body)) return summarizeMerchant(body);
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      key === "verificationLinks" ? summarizeLinks(value) : summarizeValue(value),
    ]),
  );
}
