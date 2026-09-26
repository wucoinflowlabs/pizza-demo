import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPlaceholder } from "@/features/dashboard/components/product-placeholder";
import { findMerchantProduct } from "@/features/dashboard/products";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/[product]">): Promise<Metadata> {
  const { product } = await params;
  return { title: findMerchantProduct(product)?.title ?? "Dashboard" };
}

export default async function ProductPage({ params }: PageProps<"/dashboard/[product]">) {
  const { product } = await params;
  const item = findMerchantProduct(product);
  if (!item) notFound();
  return <ProductPlaceholder title={item.title} body={item.body} />;
}
