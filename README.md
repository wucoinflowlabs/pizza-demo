# Adora × Coinflow — merchant onboarding (demo)

A white-glove demo, built for Coinflow's RFP response, of how Adora POS would onboard the restaurants in its portfolio onto Adora Payments, powered by Coinflow. Each application creates a sub-merchant under Adora's parent account with Coinflow. Every Coinflow API call runs on the server.

## Setup

```bash
cp .env.example .env.local   # then set PAYMENTS_API_KEY and APP_SECRET
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Notes |
| --- | --- |
| `PAYMENTS_API_KEY` | Admin-scoped **sandbox** API key for Adora's parent merchant. Server-only. |
| `PAYMENTS_API_BASE_URL` | Optional. Defaults to the sandbox API. |
| `APP_SECRET` | Signs invite links and session cookies. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe for the browser. |
| `SUPABASE_SECRET_KEY` | Server-only. Never prefix with `NEXT_PUBLIC_`. |

Demo tips:
- Every application needs a **new login email**. Plus-aliases (for example `demo+1@example.com`) work.
- Merchants open their invite link; the Adora team manages applications from `/operator`.

## How onboarding works

1. **Operator (`/operator`).** Creates the sub-merchant (`POST /submerchant`), prefills what Adora already knows (`POST /merchant/onboarding/draft`), and copies an invite link.
2. **Merchant (`/apply`).** Opens the invite, completes business/owner verification, finishes the remaining onboarding details, then submits the form and application for review.

Provider API details live in `docs/COINFLOW_ENDPOINTS.md`.

## Architecture

```
src/
  app/
    page.tsx                      landing
    (operator)/operator/          Adora team console
    (application)/apply/          merchant invite journey
    invite/[token]/               invite → session cookie
    (dashboard)/dashboard/        merchant home, products, Adora Pay
  features/
    operator/                     create apps, invite links, status table
    application/                  verification, details form, submit
    dashboard/                    merchant sign-in, home, Adora Pay
  lib/
    payments/                     the only code that talks to the provider (server-only)
    onboarding-form/              shared form field definitions
    session.ts                    current sub-merchant and merchant cookies
  config/brand.ts                 name, copy, logos
  components/brand/  components/ui/  components/onboarding-form/
```

Rules:
- `features/*` never import from each other. Shared code goes in `lib/`, `config/` or `components/`.
- Only `lib/payments` knows provider URLs, and every module there imports `server-only`.
- Never show a provider error body to users. `lib/payments/errors.ts` maps each error to a friendly message.

## Rebranding

Edit `src/config/brand.ts`, replace the files in `public/brand/` and `src/app/icon.png`, and change the tokens under `:root` in `src/app/globals.css`.
