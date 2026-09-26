"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const dashboard = pathname.startsWith("/dashboard");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {dashboard ? (
        children
      ) : (
        <>
          {header}
          <main className="flex flex-1 flex-col">{children}</main>
          {footer}
        </>
      )}
    </div>
  );
}
