"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";

export function HeaderCorner() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <Link href="/login" className={buttonVariants({ size: "sm" })}>
        Merchant Login
      </Link>
    );
  }

  return (
    <a
      href={`mailto:${brand.supportEmail}`}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Need help?
    </a>
  );
}
