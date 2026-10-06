# Coinflow endpoints used for merchant onboarding

Every Coinflow API call the app makes to onboard a merchant, in the order it happens. All calls go through `paymentsRequest` in `src/lib/payments/client.ts`.

- **Base URL:** `PAYMENTS_API_BASE_URL` (default `https://api-sandbox.coinflow.cash/api`)
- **Auth:** `Authorization: <PAYMENTS_API_KEY>`, Adora's admin-scoped parent merchant key
- **Acting as a sub-merchant:** calls marked *as sub-merchant* also send `x-coinflow-submerchant-id: <merchantId>`, which lets the parent key act on that sub-merchant's behalf

## Summary

| # | Method | Path | As sub-merchant | Purpose |
|---|--------|------|:---:|---------|
| 1 | `GET` | `/submerchant?page=&limit=&search=` | | List sub-merchants for the operator table |
| 2 | `POST` | `/submerchant` | | Create the sub-merchant |
| 3 | `POST` | `/merchant/onboarding/draft` | ✓ | Save (merge) a partial onboarding form |
| 4 | `GET` | `/submerchant/{merchantId}` | | Check the sub-merchant exists before re-issuing an invite |
| 5 | `GET` | `/merchant/v2` | ✓ | Read verification status, Persona inquiries, and go-live checklist |
| 6 | `GET` | `/merchant/onboarding` | ✓ | Read the stored onboarding form |
| 7 | `POST` | `/merchant/files/upload-url` | ✓ | Get a presigned URL for a document upload |
| 8 | `POST` | `/merchant/onboarding/submit` | ✓ | Submit the complete onboarding form |
| 9 | `POST` | `/merchant/onboarding/review` | ✓ | Submit the application for compliance review |
| 10 | `GET` | `/merchant/payments?since=&until=&status=&page=&limit=` | ✓ | List payments for the dashboard chart and Payments table |
| 11 | `GET` | `/merchant/payments/{paymentId}` | ✓ | Load one payment for the Payments detail drawer |
| 12 | `GET` | `/merchant/payments/{paymentId}/refund-quote?partialAmount=` | ✓ | Preview a refund's fees before confirming |
| 13 | `PUT` | `/merchant/payments/{paymentId}/refund` | ✓ | Refund a payment (full or partial) |
| 14 | `GET` | `/merchant/withdrawers?search=` | ✓ | List withdrawers (staff) for the Withdrawers table |
| 15 | `GET` | `/merchant/withdrawer/{id}/profile` | ✓ | Payouts, payout methods and reference keys for the withdrawer drawer |
| 16 | `GET` | `/merchant/withdrawer/{id}/audit-logs` | ✓ | Withdrawer audit log tab |
| 17 | `PUT` | `/merchant/block-withdrawer/{id}` | ✓ | Block or unblock a withdrawer (`{status, reason}`) |
| 18 | `GET` | `/merchant/withdraws?since=&until=&search=&page=&limit=` | ✓ | List withdrawals for the Withdraws table |
| 19 | `GET` | `/merchant/withdraws/{transferId}` | ✓ | Load one withdrawal for the Withdraws drawer |
| 20 | `GET` | `/merchant/withdraws/{transferId}/enhanced` | ✓ | Recipient phone/email/card for Venmo, PayPal and card withdrawals |
| 21 | `POST` | `/checkout/jwt-token` | ✓ | Sign a checkout's amount and Adora's marketplace fee (`feePercentage`) |

## Main flow: operator invite, then `/apply`

### 1. Operator creates the application (`/operator`)

Code: `src/features/operator/actions.ts`

1. **`GET /submerchant?page=1&limit=100`** (`listApplications`) fills the operator's applications table.
2. **`POST /submerchant`** (`createApplication`) creates the sub-merchant with `merchantId`, `email`, and the fields this endpoint accepts: `dba`, `industry`, business contact details, website/dev URLs, policy URLs, and `payinMethods`/`payoutMethods`. If the response is a 409 "merchant ID taken", the app tries the next account id.
3. **`POST /merchant/onboarding/draft`** (*as sub-merchant*) prefills every other answer Adora already knows. If this call fails, the account is still created and the operator sees a warning.
4. **`GET /submerchant/{merchantId}`** (`getInviteUrl`) runs only when an operator re-copies an invite link for an existing application.

### 2. Merchant completes the application (`/apply`)

Code: `src/app/(application)/apply/page.tsx`, `src/features/application/actions.ts`, `src/app/api/uploads/route.ts`

5. **`GET /merchant/v2`** (*as sub-merchant*) is called on page load and again through `refreshProgress`. It returns verification status, the Persona inquiry for the business (`verificationLinks.merchantLink`) and for each owner (`verificationLinks.uboLinks`), plus `goLiveChecklist`. Reading it also makes Coinflow re-check the verification case, so the app uses it as the status poll after a Persona flow finishes.
6. **`GET /merchant/onboarding`** (*as sub-merchant*) is also called on page load to hydrate the form.
7. **`POST /merchant/onboarding/draft`** (*as sub-merchant*) autosaves as the merchant fills in the form (`saveDetailsDraft`). Blank values are left out so they can't overwrite stored answers.
8. **`POST /merchant/files/upload-url`** (*as sub-merchant*) runs once for each document upload, with body `{ fileName, contentType }`. The server then `PUT`s the file bytes to the returned presigned `uploadUrl`, which is not a Coinflow API path. The returned `fileKey` is stored in the form as `fileName|fileKey`.
9. **`GET /merchant/onboarding`** (*as sub-merchant*) runs again at submit time. Submit validates only the request body, so the stored draft (including the operator's prefill) is merged with the merchant's answers first.
10. **`POST /merchant/onboarding/submit`** (*as sub-merchant*) submits the full merged form. A 400/422 response includes field errors, which the app maps back onto the form.
11. **`GET /merchant/v2`** (*as sub-merchant*) runs right after submit to refresh progress (`goLiveChecklist.onboardingFormSubmitted`).
12. **`POST /merchant/onboarding/review`** (*as sub-merchant*) runs when the merchant clicks **Submit application**, after verification is approved and the form is submitted.

## Merchant dashboard (`/dashboard/adora-pay`)

Code: `src/lib/payments/payments.ts`, `src/features/dashboard/load-payments-series.ts`

- **`GET /merchant/payments`** (*as sub-merchant*) loads the Payments chart for any merchant that has a Coinflow account. It requests `status=SETTLED` over the last 8 days (`since`/`until` in epoch ms), sorted by `createdAt`, and pages through 100 rows at a time (up to 20 pages). The response is a bare array of payments. The method comes from whichever `*Info` field is present (`cardInfo`, `cryptoInfo`, `cashAppInfo`, …). Each payment's amount is `totals.subtotal.cents`. Payments are bucketed into 7 days in the shop's time zone (`shops.timezone`, default `America/Los_Angeles`).

## Payments table and detail drawer (`/dashboard/adora-pay/payments`)

Code: `src/features/dashboard/load-orders.ts`, `src/features/dashboard/payment-detail.ts`, `src/app/api/payments/[paymentId]/`, `src/features/dashboard/payment-actions.ts`

- **`GET /merchant/payments`** (*as sub-merchant*) lists every payment in the chosen window (24h/7d/30d/90d), any status. Method comes from the `*Info` field present; Apple/Google Pay from `cardInfo.mobileWallet`; Code is `cardInfo.authCode` on failed payments; 3D Secure is `cardInfo.processed3DS`; customer is `customer.customerId`, falling back to `wallet`.
- **`GET /merchant/payments/{paymentId}`** (*as sub-merchant*) runs when a row is clicked, through the app's `GET /api/payments/{paymentId}`, which resolves the sub-merchant from the session. Chosen over `/merchant/payments/enhanced/{paymentId}` because it returns the payment itself (amount, fees, status, card brand/last4, statement descriptor, chargeback protection decision, refunds) **and** embeds `enhancedTxInfo` (cardholder and billing address, BIN/issuer, IP location, device, 3DS, AVS/CVV, decline explanation). The response is reduced to the fields the drawer shows before it reaches the browser.
- **`GET /merchant/payments/{paymentId}/refund-quote`** (*as sub-merchant*) fills the refund dialog's fee preview, via `GET /api/payments/{paymentId}/refund-quote`. `partialAmount` is in cents; omitted for a full refund.
- **`PUT /merchant/payments/{paymentId}/refund`** (*as sub-merchant*) sends the refund from a server action with `{ refundReason, partialAmount?: { cents } }`. Only `SETTLED`/`DEPOSITED` payments with an unrefunded balance offer the button.

## Withdrawers and Withdraws (`/dashboard/adora-pay/withdrawers`, `/dashboard/adora-pay/withdraws`)

Code: `src/lib/payments/withdraws.ts`, `src/features/dashboard/withdrawals.ts`, `src/app/api/withdrawers/`, `src/app/api/withdraws/`

- **`GET /merchant/withdrawers`** returns up to 100 users and 100 businesses and ignores paging. `search` is an exact match on email, user id/wallet or verification reference. Each row embeds the full merchant document, so `toWithdrawerRow` keeps only `merchantId`.
- **`GET /merchant/withdraws`** takes `since`/`until` in epoch ms (the page sends whole days in the shop's time zone) and ignores them when `search` is set.
- **`GET /merchant/withdraws/{transferId}`** only finds withdrawals on the exact sub-merchant in the header, not its children.

### Seeding staff (`scripts/seed-withdrawers.mjs`)

Staff become withdrawers through the parent key acting as the sub-merchant *and* as a user (`x-coinflow-auth-user-id: lamonica-<name>`):

1. **`POST /withdraw/kyc`** `{info: {email, firstName, surName, physicalAddress, city, state, zip, country, dob, ssn}}`. Sandbox auto-approves US KYC; ssn `1111` + zip `11111` stays pending, ssn `9999` is rejected.
2. **`POST /withdraw/venmo`** `{phoneNumber}` and **`POST /withdraw/paypal`** `{email}` link payout methods (approved withdrawers only).
3. **`POST /merchant/withdraws/payout/delegated`** `{userId, amount, speed, account: <method token>, idempotencyKey}` pays tips from the sub-merchant's Coinflow wallet (`GET /merchant/withdraws/payout/balance`).

## Checkout fees and daily statements (`/lamonica/checkout`, `/dashboard/adora-pay/statements`)

Code: `src/features/statements/`, `src/lib/payments/checkout.ts`, `src/features/lamonica/checkout-token.ts`, `src/app/api/statements/daily/route.ts`

- **`POST /checkout/jwt-token`** (*as sub-merchant*) runs when a diner continues to payment. The body has the order `subtotal`, recomputed from the menu on the server, and `feePercentage` = Adora SaaS + franchise royalty from the fee schedule (`fee-schedule.ts`, default 0.50% + 6.00%). Coinflow takes that percentage from the subtotal before the sub-merchant settles. `webhookInfo.fees` stamps the rates charged (`{ version, saasBps, royaltyBps }`), and `GET /merchant/payments` echoes `webhookInfo` back, so the statement can split the combined fee into SaaS and royalty. The returned `checkoutJwtToken` is passed to `<CoinflowPurchase jwtToken>`; it is single-use, so each checkout attempt mints a new one.
- **`GET /merchant/payments`** (*as sub-merchant*) feeds the statements. List rows carry the full `totals`, including `merchantPaid*Fees`. The statement deducts only those merchant-paid processing fees from the restaurant; the diner-paid fees (`creditCardFees` etc.) are shown as pass-through. The hardware program is a flat daily charge from the fee schedule and is not collected through Coinflow.
- The statements tracker makes one list call per location for the last 14 days and buckets payments by business day (Pacific). The PDF (`GET /api/statements/daily?date=&location=<store id>|all`) is rendered with `@react-pdf/renderer` and is available to franchise owners only.
