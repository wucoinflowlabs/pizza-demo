import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { brand } from "@/config/brand";

// Checked at render so the official Coinflow file shows up as soon as it's dropped in.
function hasCoinflowLogo() {
  return existsSync(path.join(process.cwd(), "public", brand.logos.coinflow));
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="inline-flex items-center gap-2">
        <Image src={brand.logos.adora} alt="" width={30} height={25} priority />
        <span className="font-heading text-lg font-bold tracking-tight text-adora-navy">
          Adora
        </span>
      </span>
      <span aria-hidden className="text-sm font-medium text-muted-foreground">
        ×
      </span>
      {hasCoinflowLogo() ? (
        <Image
          src={brand.logos.coinflow}
          alt="Coinflow"
          width={96}
          height={24}
          className="h-5 w-auto"
          priority
        />
      ) : (
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          Coinflow
        </span>
      )}
    </span>
  );
}
