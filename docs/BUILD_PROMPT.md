# Build prompt — The Za merchant onboarding (white-label)

You are working in an existing Next.js repo (App Router, TypeScript, Tailwind v4, shadcn/ui already initialized, npm). Read `AGENTS.md` first — this Next.js version has breaking changes; check `node_modules/next/dist/docs/` before using any Next API you're unsure of.

## Goal

Build a **white-label merchant onboarding flow** for **The Za**. Businesses that sign up become **sub-merchants of The Za** in our payments provider (parent merchantId `theza`). This is a sales demo for The Za, so it must look polished and like The Za's own product.

Only build onboarding now. Structure the app so two more flows can be added later without refactoring: a **checkout flow** and a **sub-merchant dashboard**.

## Hard rule: white-label

The provider must be invisible to the end user.

- No provider name, logo, domain, or URL anywhere in the UI, page titles, metadata, favicons, error messages, toasts, or the client JS bundle.
- The browser must never call the provider API directly. All provider calls run on the server (Server Actions or Route Handlers), so the network tab only shows requests to this app.
- Name code by its role, not by the vendor: `src/lib/payments/*`, `PAYMENTS_API_KEY`, `PAYMENTS_API_BASE_URL`. The provider's name may appear only in server-side code comments and in this doc.
- Never forward provider error bodies to the client. Map them to friendly, brand-neutral messages (see Errors).
- Import `server-only` in every module that reads the API key.

## Environment

`.env.example` already exists. Copy it to `.env.local`:

```
PAYMENTS_API_BASE_URL=https://api-sandbox.coinflow.cash/api
PAYMENTS_API_KEY=<The Za's admin-scoped sandbox API key>
```

Validate both vars at startup with zod in `src/lib/payments/env.ts`. Fail loudly on the server with a clear message.

## Provider API (server-side only)

Every request sends the header `Authorization: <PAYMENTS_API_KEY>` plus `accept: application/json` and `content-type: application/json`. The parent merchant (`theza`) is **derived from the API key**. Never send a parent ID. Never send the `x-coinflow-submerchant-id` header on create, or it returns 400.

### Create sub-merchant: `POST /submerchant`

Creates the sub-merchant and prefills a **draft** onboarding form.

```jsonc
{
  "merchantId": "string",          // required, globally unique, 3–50 chars, /^[a-zA-Z0-9-]+$/, stored lowercased
  "email": "string",               // required, globally unique; the sub-merchant's login email
  "dba": "string",                 // business / DBA name
  "industry": "foodBeverage",      // enum below
  "businessEmail": "string",
  "businessPhoneNumber": "string",
  "businessPhoneCountryCode": "+1",
  "billingEmail": "string",        // optional if billingEmailSameAsBusinessEmail = true
  "billingEmailSameAsBusinessEmail": true,
  "websiteUrls": ["https://..."],  // 1–5 URLs, required
  "developmentUrls": ["https://..."], // optional, max 5
  "privacyPolicyUrl": "https://...",
  "termsOfServiceUrl": "https://...",
  "returnPolicyUrl": "https://...", // optional
  "payinMethods": "card,applePay,googlePay",  // comma-separated string, NOT an array
  "payoutMethods": "standard,asap",           // comma-separated string
  "endUserJurisdictions": "US,Canada"         // comma-separated string
}
```

The body schema is **strict**. Unknown keys return 400, so send only these fields. Response: `{ merchantId, email, ...savedFields }`. This endpoint is rate-limited, so don't retry automatically.

### Update sub-merchant: `PATCH /submerchant/{merchantId}`

Takes the same fields, all optional, **excluding** `merchantId` and `email`. It merge-updates the draft. `websiteUrls` and `developmentUrls` replace the whole array. Returns 404 if the sub-merchant doesn't exist and 409 if the application has already been submitted.

### Read: `GET /submerchant/{merchantId}` and `GET /submerchant?page=&limit=&search=`

Returns the sanitized merchant, including `verification.status`. Onboarding doesn't need these yet; the dashboard flow will.

### Enum values (send the value, show the label)

**industry:** `foodBeverage` (Food & Beverage, the default for The Za), `retailEcommerce`, `professionalServices`, `healthcareWellness`, `educationTraining`, `technologyDigitalServices`, `travelHospitality`, `Sports / Recreation`, `nonProfit`, `supplements`, `other`. Do not offer `cryptocurrency`, `remittance`, `sweepstakes`, or `tradingCardPlatform` in this demo.

**payinMethods:** `card` (Credit & Debit Cards), `applePay`, `googlePay`, `ach` (US Bank Transfer), `paypal`, `venmo`, `cashApp`, `interac` (Canada), `sepa` (EU bank), `fasterPayments` (UK bank), `pix` (Brazil). Do not show any crypto option.

**payoutMethods:** `standard` (ACH bank payout), `asap` (Instant bank payout, RTP), `card` (Push to debit card), `wire` (US domestic wire), `paypal`, `venmo`, `iban` (SEPA / UK Faster Payments), `eft` (Canada EFT), `interac`, `pix`, `swift` (International wire). Do not show `crypto`.

**endUserJurisdictions:** `US`, `Canada`, `UK`, `EU`, `Latin America`, `Brazil`, `Australia`, `Asia`, `Middle East`, `Africa`.

## Onboarding UX

Build a multi-step wizard at `/onboarding` with a progress indicator and back/next navigation. Validate each step with zod plus react-hook-form, using shadcn `Form`, `Input`, `Select`, `Checkbox`, `Button`, and `Card` components.

1. **Account.** Login email, business name (DBA), industry.
2. **Contact.** Business email, phone (country code + number), and billing email with a "same as business email" checkbox.
3. **Online presence.** Website URLs (1–5, add/remove rows), plus privacy policy, terms of service, and return policy (optional) URLs.
4. **Payments.** Pay-in methods (multi-select checkboxes), payout methods (multi-select), and customer regions (multi-select).
5. **Review.** Read-only summary of every step, with "Edit" links back to each step.
6. **Submit.** Show a loading state, then go to `/onboarding/submitted`, a branded "Application received — we'll be in touch" page showing the business name and a reference ID (the merchantId).

Behaviour:

- Generate `merchantId` on the server: `slugify(dba)` + `-` + 6 random lowercase alphanumeric characters, trimmed to 50 characters. Never ask the user for it.
- **Create early, update later.** Call `POST /submerchant` when the user completes step 1, sending `merchantId`, `email`, `dba`, and `industry`. Then store `merchantId` in an httpOnly, secure, sameSite=lax cookie named `za_account`. Steps 2–4 each call `PATCH` with only that step's fields. If the user reloads, keep the wizard state in client state (zustand or context, persisted to sessionStorage). If the cookie already exists, step 1 PATCHes instead of creating again. `email` can't be changed after create, so disable that field once the account exists.
- Join array fields with `,` before sending them.
- "Submit" on the review step sends one final PATCH with every field (so nothing is stale), then redirects. **Note:** the API has no "submit for underwriting" endpoint. The application stays a draft on the provider side. The demo intentionally stops here, and nothing provider-branded is shown.

## Errors

In `src/lib/payments/errors.ts`, map provider responses to a typed `PaymentsError { code, userMessage }`:

- 400 containing "Email … is already used" → `EMAIL_TAKEN`: "An account with this email already exists."
- 400 about Merchant ID → regenerate the ID and retry once, silently.
- 400 validation errors → `INVALID_FIELDS`. Parse field names if you can, attach the errors to the form fields, and never show raw text.
- 404 → `NOT_FOUND`: clear the cookie and restart onboarding.
- 409 → `ALREADY_SUBMITTED`: redirect to `/onboarding/submitted`.
- 429 → "Too many attempts, please wait a minute."
- Anything else → "Something went wrong. Please try again." Log full details on the server only.

## Architecture (follow exactly; the empty folders already exist)

```
src/
  app/
    layout.tsx                  # Brand shell: <BrandHeader/>, fonts, metadata from brand config
    page.tsx                    # Landing: "Start accepting payments with The Za" → /onboarding
    (onboarding)/onboarding/
      layout.tsx                # Wizard chrome + progress
      page.tsx                  # Renders <OnboardingWizard/>
      submitted/page.tsx
    (dashboard)/                # FUTURE: sub-merchant dashboard (leave .gitkeep only)
    (checkout)/                 # FUTURE: checkout flow (leave .gitkeep only)
  features/
    onboarding/
      components/               # Step components, Wizard, ReviewSummary
      schema.ts                 # zod schemas per step + full schema (shared client/server)
      options.ts                # enum value→label maps above
      actions.ts                # 'use server' actions: createAccount, updateStep, submitApplication
      store.ts                  # client wizard state
    dashboard/                  # FUTURE (.gitkeep)
    checkout/                   # FUTURE (.gitkeep)
  lib/
    payments/                   # The ONLY place that talks to the provider. server-only.
      env.ts
      client.ts                 # fetch wrapper: base URL, auth header, JSON, timeout, error mapping
      errors.ts
      submerchants.ts           # createSubmerchant, updateSubmerchant, getSubmerchant, listSubmerchants
      types.ts
    session.ts                  # get/set/clear the za_account cookie (server-only)
  config/
    brand.ts                    # name, tagline, logo path, support email, color tokens
  components/
    brand/                      # Logo, BrandHeader, BrandFooter
    ui/                         # shadcn (generated)
```

Rules:

- `features/*` may import from `lib/*`, `config/*`, and `components/*`. They never import from each other.
- Only `lib/payments` knows the provider's URL shapes. Future features add functions to `lib/payments/*` (for example `checkout.ts` and `dashboard.ts`) and reuse `client.ts`.
- `lib/session.ts` is the single source of the "current sub-merchant", so the future dashboard and checkout flows can read it.

## Branding (placeholder, swappable)

- Put all brand values in `src/config/brand.ts` and the CSS variables in `globals.css` (shadcn tokens: `--primary`, `--background`, etc.). Use a neutral placeholder: wordmark text "The Za", a simple SVG mark in `public/brand/logo.svg`, and a warm-neutral palette. Swapping in real assets should mean changing only `brand.ts`, `logo.svg`, and the CSS tokens.
- Replace the default Next.js favicon and remove all create-next-app boilerplate (`public/*.svg`, default page content).
- Set `metadata.title` to the pattern `%s · The Za`.
- Must look good on mobile (≥360px) and desktop, in light mode. Dark mode is optional.

## Quality bar

- `npm run build` and `npm run lint` both pass. TypeScript strict, no `any`.
- Add `server-only` and `zod`, plus `react-hook-form` and `@hookform/resolvers`. Add shadcn components via `npx shadcn@latest add ...`.
- No hardcoded secrets. Nothing prefixed `NEXT_PUBLIC_` that relates to payments.
- Before finishing, run `npm run build` and grep the client output: `grep -ri coinflow .next/static` must return nothing.
- Update `README.md` with setup steps (env, `npm run dev`), the architecture summary, and how to add the dashboard and checkout flows.

## Out of scope for now

Auth/login, the dashboard, checkout, KYB document upload, webhooks, and a database.
