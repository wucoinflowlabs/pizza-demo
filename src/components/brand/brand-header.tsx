import Link from "next/link";
import { brand } from "@/config/brand";
import { Logo } from "./logo";

export function BrandHeader() {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label={`${brand.name} home`}>
          <Logo />
        </Link>
        <a
          href={`mailto:${brand.supportEmail}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Need help?
        </a>
      </div>
    </header>
  );
}
