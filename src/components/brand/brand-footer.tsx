import { brand } from "@/config/brand";

export function BrandFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {brand.legalName}
        </span>
      </div>
    </footer>
  );
}
