"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

export function HeaderCorner() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <Link href="/login" className={buttonVariants({ size: "sm" })}>
      Merchant Login
    </Link>
  );
}
