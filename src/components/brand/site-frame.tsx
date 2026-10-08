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
  const bare = pathname.startsWith("/dashboard") || pathname.startsWith("/woodstock-pizza");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {bare ? (
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
