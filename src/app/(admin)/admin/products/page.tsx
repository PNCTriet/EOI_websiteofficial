import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { t } from "@/i18n/translate";
import { formatDate, formatProductPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type { ProductRow } from "@/types/database";

export default async function AdminProductsPage() {
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const supabase = await createClient();
  let products: ProductRow[] = [];
  try {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    products = (data as ProductRow[] | null) ?? [];
  } catch {
    products = [];
  }

  return (
    <div className="p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
          {tr("admin.products.title")}
        </h1>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-eoi-pink px-4 py-2.5 font-dm text-sm font-semibold text-white"
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
          {tr("admin.products.addNew")}
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-eoi-border bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left font-dm text-sm">
          <thead>
            <tr className="border-b border-eoi-border bg-eoi-surface/80">
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tableImage")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tableName")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tablePrice")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tableAvailability")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tableListingStatus")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tableDateCreated")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.products.tableActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-eoi-ink2"
                >
                  {tr("admin.products.emptyHint")}
                </td>
              </tr>
            ) : (
              products.map((p, i) => (
                <tr
                  key={p.id}
                  className={i % 2 === 1 ? "bg-eoi-surface/50" : ""}
                >
                  <td className="px-4 py-2">
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-eoi-border">
                      {p.image_urls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_urls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium text-eoi-ink">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-eoi-ink">
                    {formatProductPrice(
                      locale,
                      p.price,
                      tr("store.priceNotSet")
                    )}
                  </td>
                  <td className="px-4 py-2 text-eoi-ink2">
                    {(p.availability ?? "in_stock") === "coming_soon"
                      ? tr("store.availabilityComingSoon")
                      : (p.availability ?? "in_stock") === "out_of_stock"
                        ? tr("store.availabilityOutOfStock")
                        : tr("admin.products.availabilityShortInStock")}
                  </td>
                  <td className="px-4 py-2">
                    <ProductActiveToggle
                      productId={p.id}
                      initialActive={p.is_active}
                    />
                  </td>
                  <td className="px-4 py-2 text-eoi-ink2">
                    {formatDate(locale, p.created_at)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-eoi-ink hover:bg-eoi-surface"
                        aria-label={tr("admin.products.edit")}
                      >
                        <Pencil size={18} strokeWidth={2} />
                      </Link>
                      <span className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-eoi-ink2 opacity-40">
                        <Trash2 size={18} strokeWidth={2} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
