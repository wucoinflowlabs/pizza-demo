import { Toaster } from "@/components/ui/sonner";

export default function OperatorLayout({ children }: LayoutProps<"/operator">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      {children}
      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
