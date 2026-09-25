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
| 9 | `PATCH` | `/submerchant/{merchantId}` | | Update sub-merchant fields (legacy `/onboarding` wizard only) |

## Main flow: operator invite, then `/apply`

### 1. Operator creates the application (`/operator`)

Code: `src/features/operator/actions.ts`

1. **`GET /submerchant?page=1&limit=100`** (`listApplications`) fills the operator's applications table.
2. **`POST /submerchant`** (`createApplication`) creates the sub-merchant with `merchantId`, `email`, and the fields this endpoint accepts: `dba`, `industry`, business contact details, website/dev URLs, policy URLs, and `payinMethods`/`payoutMethods`. If the response is a 409 "merchant ID taken", the app retries once with a freshly generated ID.
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

## Legacy flow: self-serve `/onboarding` wizard

Code: `src/features/onboarding/actions.ts`

- **`POST /submerchant`** runs on step 1 (Account) to create the sub-merchant, with the same retry-once behaviour for a taken merchant ID.
- **`PATCH /submerchant/{merchantId}`** runs on each later step (Contact, Online presence, Payments) and again on final submit to re-send every answer. This flow never calls `/merchant/onboarding/submit`, so the application stays a draft on Coinflow's side.
