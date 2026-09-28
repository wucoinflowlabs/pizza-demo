"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

export function HeaderCorner() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className={buttonVariants({ size: "sm" })}>
        Merchant Login
      </Link>
      <Link
        href="/operator"
        className={cn(
          buttonVariants({ size: "sm" }),
          "bg-adora-blue text-white hover:bg-adora-blue/85",
        )}
      >
        Admin Login
      </Link>
    </div>
  );
}
