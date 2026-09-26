import Image from "next/image";
import { brand } from "@/config/brand";

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
      <Image
        src={brand.logos.coinflow}
        alt="Coinflow"
        width={528}
        height={116}
        className="h-5 w-auto"
        priority
      />
    </span>
  );
}
