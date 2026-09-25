import Link from "next/link";
import { brand } from "@/config/brand";

export function BrandFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          © {new Date().getFullYear()} {brand.legalName}
        </span>
        <span className="flex gap-4">
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground">
            {brand.supportEmail}
          </a>
          <Link href="/operator" className="hover:text-foreground">
            Team sign in
          </Link>
        </span>
      </div>
    </footer>
  );
}
