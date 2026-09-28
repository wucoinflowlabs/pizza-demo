/** Login page with the account email filled in after onboarding. */
export function dashboardLoginHref(email?: string) {
  const trimmed = email?.trim();
  if (!trimmed) return "/login";
  return `/login?email=${encodeURIComponent(trimmed)}`;
}
