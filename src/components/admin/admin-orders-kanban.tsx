import Link from "next/link";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import type { Messages } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { OrderStage } from "@/types/database";

export type KanbanOrder = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  displayName: string;
};

type Column = {
  key: string;
  titleKey: string;
  stages: OrderStage[];
};

const COLUMNS: Column[] = [
  { key: "pending_payment", titleKey: "admin.orders.kanbanColPending", stages: ["pending_payment"] },
  { key: "paid", titleKey: "admin.orders.kanbanColPaid", stages: ["paid"] },
  { key: "processing", titleKey: "admin.orders.kanbanColProcessing", stages: ["processing"] },
  { key: "printing", titleKey: "admin.orders.kanbanColPrinting", stages: ["printing"] },
  { key: "shipped", titleKey: "admin.orders.kanbanColShipped", stages: ["shipped"] },
  { key: "delivered", titleKey: "admin.orders.kanbanColDelivered", stages: ["delivered"] },
  { key: "issues", titleKey: "admin.orders.kanbanColIssues", stages: ["cancelled", "expired"] },
];

type Props = {
  orders: KanbanOrder[];
  locale: Locale;
  messages: Messages;
};

export function AdminOrdersKanban({ orders, locale, messages }: Props) {
  const tr = (path: string, vars?: Record<string, string>) => t(messages, path, vars);

  return (
    <div className="mt-4 flex gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] sm:mt-6">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => col.stages.includes(o.stage));
        return (
          <div
            key={col.key}
            className="flex w-[min(280px,85vw)] flex-shrink-0 flex-col rounded-2xl border border-eoi-border bg-eoi-surface/40 p-3"
          >
            <h2 className="font-syne text-sm font-bold text-eoi-ink">
              {tr(col.titleKey)}{" "}
              <span className="font-dm text-xs font-normal text-eoi-ink2">({colOrders.length})</span>
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {colOrders.length === 0 ? (
                <p className="font-dm text-xs text-eoi-ink2">{tr("admin.orders.kanbanEmpty")}</p>
              ) : (
                colOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="block rounded-xl border border-eoi-border bg-white p-3 shadow-sm hover:border-eoi-pink/40"
                  >
                    <p className="font-dm text-xs text-eoi-ink2">
                      {o.sepay_ref ?? o.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 font-dm text-xs text-eoi-ink">{o.displayName || tr("common.dash")}</p>
                    <p className="mt-1 font-syne text-sm font-bold text-eoi-ink">
                      {formatPrice(locale, o.total_amount)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                      <span className="inline-block rounded-full bg-eoi-border/80 px-2 py-0.5 font-dm text-[10px] font-bold uppercase tracking-wide text-eoi-ink2">
                        {tr(`stagesShort.${o.stage}`)}
                      </span>
                      <span className="font-dm text-[10px] text-eoi-ink2">
                        {formatDate(locale, o.created_at)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
