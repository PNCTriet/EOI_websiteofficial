import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CustomOrderForm } from "./custom-order-form";

type Props = {
  searchParams: Promise<{ productId?: string; variantId?: string }>;
};

export default async function AdminCustomOrderPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id,name,price")
    .order("name");
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id,product_id,label,sort_order")
    .order("sort_order");

  return (
    <Suspense
      fallback={
        <div className="animate-pulse min-h-[240px] rounded-2xl border border-eoi-border bg-eoi-surface p-6" />
      }
    >
      <CustomOrderForm
        catalog={{ products: products ?? [], variants: variants ?? [] }}
        initialProductId={sp.productId}
        initialVariantId={sp.variantId}
      />
    </Suspense>
  );
}
