const CALL_LABELS: { method: string; pattern: RegExp; label: string }[] = [
  { method: "GET", pattern: /^\/submerchant(\?|$)/, label: "List sub-merchants" },
  { method: "POST", pattern: /^\/submerchant$/, label: "Create sub-merchant" },
  { method: "GET", pattern: /^\/submerchant\/[^/?]+$/, label: "Look up sub-merchant" },
  { method: "PATCH", pattern: /^\/submerchant\/[^/?]+$/, label: "Update sub-merchant" },
  { method: "GET", pattern: /^\/merchant\/onboarding$/, label: "Load onboarding form" },
  { method: "POST", pattern: /^\/merchant\/onboarding\/draft$/, label: "Save onboarding draft" },
  { method: "POST", pattern: /^\/merchant\/onboarding\/submit$/, label: "Submit onboarding form" },
  { method: "POST", pattern: /^\/merchant\/onboarding\/review$/, label: "Submit for compliance review" },
  { method: "GET", pattern: /^\/merchant\/v2$/, label: "Check verification status" },
  { method: "GET", pattern: /^\/merchant\/payments(\?|$)/, label: "List payments" },
  { method: "GET", pattern: /^\/merchant\/payments\/[^/?]+$/, label: "Get payment" },
  { method: "GET", pattern: /^\/merchant\/payments\/[^/?]+\/refund-quote(\?|$)/, label: "Quote refund" },
  { method: "PUT", pattern: /^\/merchant\/payments\/[^/?]+\/refund$/, label: "Refund payment" },
  { method: "GET", pattern: /^\/merchant\/chargebacks(\?|$)/, label: "List chargebacks" },
  { method: "POST", pattern: /^\/merchant\/chargebacks\/[^/?]+\/accept$/, label: "Accept chargeback" },
  { method: "GET", pattern: /^\/merchant\/chargebacks\/[^/?]+$/, label: "Get chargeback" },
  { method: "GET", pattern: /^\/merchant\/chargebacks\/[^/?]+\/draft$/, label: "Load chargeback draft" },
  { method: "PUT", pattern: /^\/merchant\/chargebacks\/[^/?]+\/draft$/, label: "Save chargeback draft" },
  { method: "POST", pattern: /^\/merchant\/chargebacks\/[^/?]+\/respond$/, label: "Respond to chargeback" },
  { method: "PUT", pattern: /^\/merchant\/chargebacks\/simulate\/[^/?]+\/[^/?]+$/, label: "Simulate chargeback" },
  { method: "POST", pattern: /^\/merchant\/settlement-address$/, label: "Set settlement address" },
  { method: "POST", pattern: /^\/merchant\/files\/upload-url$/, label: "Request document upload URL" },
  { method: "GET", pattern: /^\/auth\/session-key$/, label: "Create checkout session" },
  { method: "GET", pattern: /^\/merchant\/withdrawers(\?|$)/, label: "List withdrawers" },
  { method: "GET", pattern: /^\/merchant\/withdrawer\/[^/?]+\/profile$/, label: "Get withdrawer profile" },
  { method: "GET", pattern: /^\/merchant\/withdrawer\/[^/?]+\/audit-logs$/, label: "Get withdrawer audit log" },
  { method: "PUT", pattern: /^\/merchant\/block-withdrawer\/[^/?]+$/, label: "Update withdrawer block status" },
  { method: "GET", pattern: /^\/merchant\/withdraws(\?|$)/, label: "List withdrawals" },
  { method: "GET", pattern: /^\/merchant\/withdraws\/[^/?]+$/, label: "Get withdrawal" },
  { method: "GET", pattern: /^\/merchant\/withdraws\/[^/?]+\/enhanced$/, label: "Get withdrawal recipient" },
];

/** A readable step name for a payments API call, for the activity panel. */
export function describePaymentsCall(method: string, path: string) {
  return (
    CALL_LABELS.find((entry) => entry.method === method && entry.pattern.test(path))?.label ??
    `${method} ${path.split("?")[0]}`
  );
}

const WEBHOOK_LABELS: Record<string, string> = {
  "Sub-merchant KYB Created": "KYB case opened",
  "Sub-merchant KYB Success": "KYB approved",
  "Sub-merchant KYB Failure": "KYB failed",
  "Seller Blocked": "Seller blocked",
};

export function describeWebhook(eventType: string) {
  return WEBHOOK_LABELS[eventType] ?? eventType;
}
