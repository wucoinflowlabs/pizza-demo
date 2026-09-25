export default function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">{children}</div>
  );
}
