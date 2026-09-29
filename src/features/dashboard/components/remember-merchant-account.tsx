"use client";

import { useEffect } from "react";
import { rememberMerchantAccount } from "../actions";

/** Stamps the account cookie after render. Next.js only allows cookie writes in a Server Action. */
export function RememberMerchantAccount() {
  useEffect(() => {
    void rememberMerchantAccount();
  }, []);
  return null;
}
