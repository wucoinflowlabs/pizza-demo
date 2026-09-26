import type { Metadata } from "next";
import { Geist_Mono, Inter, Montserrat } from "next/font/google";
import { BrandFooter } from "@/components/brand/brand-footer";
import { BrandHeader } from "@/components/brand/brand-header";
import { SiteFrame } from "@/components/brand/site-frame";
import { brand } from "@/config/brand";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
const display = Montserrat({ variable: "--font-display", subsets: ["latin"] });
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
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteFrame header={<BrandHeader />} footer={<BrandFooter />}>
          {children}
        </SiteFrame>
      </body>
    </html>
  );
}
