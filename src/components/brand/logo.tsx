import Image from "next/image";
import { brand } from "@/config/brand";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Image src={brand.logoPath} alt="" width={28} height={28} priority />
      <span className="font-heading text-lg font-semibold tracking-tight">
        {brand.name}
      </span>
    </span>
  );
}
