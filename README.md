# The Za — merchant onboarding (demo)

White-label onboarding for businesses joining The Za's payments platform. Each application creates a sub-merchant under The Za's parent account with our payments provider. The provider is never visible to the user: every call runs on the server.

## Setup

```bash
cp .env.example .env.local   # then set PAYMENTS_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Notes |
| --- | --- |
| `PAYMENTS_API_KEY` | Admin-scoped **sandbox** API key for The Za's parent merchant. Server-only. |
| `PAYMENTS_API_BASE_URL` | Optional. Defaults to the sandbox API. |

Demo tips:
- Every application needs a **new login email**. Plus-aliases (for example `demo+1@example.com`) work.
- "Start a new application" on the confirmation page clears the current application.

## How onboarding works

1. **Your business.** Creates the sub-merchant (`POST /submerchant`) with a generated ID such as `tonys-brick-oven-a8k2m1`, then stores the ID in the httpOnly `za_account` cookie.
2. **Contact details**, 3. **Online presence**, 4. **Payments.** Each step saves its own fields (`PATCH /submerchant/{id}`).
5. **Review → Submit.** Re-sends every answer, then shows the confirmation page.

The provider API has no "submit for underwriting" call, so on their side the application stays a **draft**. Verification (KYB) and underwriting happen outside this app.

## Architecture

```
src/
  app/
    page.tsx                      landing
    (onboarding)/onboarding/      wizard + /submitted
    (dashboard)/                  future: sub-merchant dashboard
    (checkout)/                   future: checkout flow
  features/
    onboarding/                   schema, options, server actions, wizard state, step UI
    dashboard/  checkout/         future
  lib/
    payments/                     the only code that talks to the provider (server-only)
    session.ts                    "current sub-merchant" cookie shared by every flow
  config/brand.ts                 name, copy, logo, support email
  components/brand/  components/ui/
```

Rules:
- `features/*` never import from each other. Shared code goes in `lib/`, `config/` or `components/`.
- Only `lib/payments` knows provider URLs, and every module there imports `server-only`.
- Never show a provider error body to users. `lib/payments/errors.ts` maps each error to a friendly message.

## Adding the dashboard or checkout flow

1. Add pages under `src/app/(dashboard)/dashboard/...` or `src/app/(checkout)/checkout/...`.
2. Put the UI and server actions in `src/features/dashboard` or `src/features/checkout`.
3. Add provider calls to `src/lib/payments/` (for example `dashboard.ts`) using `paymentsRequest` from `client.ts`. `getSubmerchant` and `listSubmerchants` already exist.
4. Read the current sub-merchant with `getCurrentAccountId()` from `src/lib/session.ts`.

## Rebranding

Edit `src/config/brand.ts`, replace `public/brand/logo.svg` and `src/app/icon.svg`, and change the tokens under `:root` in `src/app/globals.css`.

## White-label check

```bash
npm run build && grep -ril coinflow .next/static   # must print nothing
```

The original build spec lives in `docs/BUILD_PROMPT.md`.
