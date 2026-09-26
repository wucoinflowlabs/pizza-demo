import "server-only";
import { paymentsRequest } from "./client";
import type { CreateSubmerchantInput, Submerchant, SubmerchantDraft } from "./types";

export function createSubmerchant(input: CreateSubmerchantInput) {
  return paymentsRequest<SubmerchantDraft>({
    method: "POST",
    path: "/submerchant",
    body: input,
  });
}

export function getSubmerchant(merchantId: string) {
  return paymentsRequest<Submerchant | null>({
    method: "GET",
    path: `/submerchant/${encodeURIComponent(merchantId)}`,
  });
}

type ListedSubmerchant = {
  merchantId?: string;
  users?: { email?: string }[];
};

/** The sub-merchant id whose login email matches, if one exists under this parent. */
export async function findSubmerchantIdByEmail(email: string): Promise<string | undefined> {
  const target = email.trim().toLowerCase();
  if (!target) return undefined;

  for (let page = 1; page <= 20; page++) {
    const rows = (await listSubmerchants({ page, limit: 100 })) as ListedSubmerchant[];
    if (!Array.isArray(rows) || rows.length === 0) return undefined;
    for (const row of rows) {
      const matches = row.users?.some((user) => user.email?.toLowerCase() === target);
      if (matches && row.merchantId) return row.merchantId;
    }
    if (rows.length < 100) return undefined;
  }
  return undefined;
}

export function listSubmerchants({
  page = 1,
  limit = 100,
  search,
}: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  return paymentsRequest<Submerchant[]>({
    method: "GET",
    path: `/submerchant?${params.toString()}`,
  });
}
