import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type { CustomerRow, OrderRow } from "@/types/database";

type CustomerStats = CustomerRow & {
  order_count: number;
  total_spent: number;
};

export default async function AdminCustomersPage() {
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const supabase = await createClient();
  let rows: CustomerStats[] = [];

  try {
    const { data: customers } = await supabase.from("customers").select("*");
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id, total_amount");

    const list = (customers as CustomerRow[] | null) ?? [];
    const ord = (orders as Pick<OrderRow, "customer_id" | "total_amount">[] | null) ?? [];

    const byCustomer = new Map<string, { count: number; sum: number }>();
    for (const o of ord) {
      if (!o.customer_id) continue;
      const cur = byCustomer.get(o.customer_id) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += o.total_amount;
      byCustomer.set(o.customer_id, cur);
    }

    rows = list.map((c) => {
      const s = byCustomer.get(c.id) ?? { count: 0, sum: 0 };
      return { ...c, order_count: s.count, total_spent: s.sum };
    });
  } catch {
    rows = [];
  }

  return (
    <div className="p-5 md:p-6">
      <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
        {tr("admin.customers.title")}
      </h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-eoi-border bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left font-dm text-sm">
          <thead>
            <tr className="border-b border-eoi-border bg-eoi-surface/80">
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.customers.tableName")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.customers.tableEmail")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.customers.tablePhone")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.customers.tableOrderCount")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.customers.tableTotalSpent")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.customers.tableCreatedAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-eoi-ink2">
                  {tr("admin.customers.noCustomers")}
                </td>
              </tr>
            ) : (
              rows.map((c, i) => (
                <tr
                  key={c.id}
                  className={i % 2 === 1 ? "bg-eoi-surface/50" : ""}
                >
                  <td className="px-4 py-3 font-medium text-eoi-ink">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-eoi-ink2">{c.email ?? tr("common.dash")}</td>
                  <td className="px-4 py-3 text-eoi-ink2">{c.phone ?? tr("common.dash")}</td>
                  <td className="px-4 py-3 text-eoi-ink">{c.order_count}</td>
                  <td className="px-4 py-3 text-eoi-ink">
                    {formatPrice(locale, c.total_spent)}
                  </td>
                  <td className="px-4 py-3 text-eoi-ink2">
                    {formatDate(locale, c.created_at)}
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
