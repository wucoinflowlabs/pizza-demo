import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BrandFooter } from "@/components/brand/brand-footer";
import { BrandHeader } from "@/components/brand/brand-header";
import { brand } from "@/config/brand";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BrandHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <BrandFooter />
      </body>
    </html>
  );
}
