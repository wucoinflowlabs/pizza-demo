import "server-only";
import { paymentsRequest } from "./client";
import type {
  CreateSubmerchantInput,
  Submerchant,
  SubmerchantDraft,
  SubmerchantFields,
} from "./types";

export function createSubmerchant(input: CreateSubmerchantInput) {
  return paymentsRequest<SubmerchantDraft>({
    method: "POST",
    path: "/submerchant",
    body: input,
  });
}

export function updateSubmerchant({
  merchantId,
  fields,
}: {
  merchantId: string;
  fields: SubmerchantFields;
}) {
  return paymentsRequest<SubmerchantDraft>({
    method: "PATCH",
    path: `/submerchant/${encodeURIComponent(merchantId)}`,
    body: fields,
  });
}

export function getSubmerchant(merchantId: string) {
  return paymentsRequest<Submerchant | null>({
    method: "GET",
    path: `/submerchant/${encodeURIComponent(merchantId)}`,
  });
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
