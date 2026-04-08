"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderPreviewQuickDialog, OrderStageQuickDialog } from "@/components/admin/admin-order-quick-dialogs";
import { useTranslations } from "@/components/locale-provider";
import { formatDate, formatPrice } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";
import { orderStageBadgeClass } from "@/lib/order-stage-entered-at";
import type { OrderStage } from "@/types/database";

/** Cùng shape với KanbanOrder trong admin-orders-kanban (tránh import vòng). */
type KanbanOrderCard = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  displayName: string;
};

type Props = {
  order: KanbanOrderCard;
  locale: Locale;
};

export function AdminKanbanOrderCard({ order: o, locale }: Props) {
  const t = useTranslations();
  const ref = o.sepay_ref ?? o.id.slice(0, 8);
  const [mounted, setMounted] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="rounded-xl border border-eoi-border bg-white p-3 shadow-sm transition hover:border-eoi-pink/40">
        <p className="font-dm text-xs text-eoi-ink2">{ref}</p>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="mt-1 w-full text-left font-dm text-xs font-medium text-eoi-ink underline-offset-2 hover:text-eoi-pink-dark hover:underline"
        >
          {o.displayName || t("common.dash")}
        </button>
        <p className="mt-1 font-syne text-sm font-bold text-eoi-ink">{formatPrice(locale, o.total_amount)}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => setStageOpen(true)}
            className={`inline-flex min-h-[32px] items-center rounded-full px-2 py-1 font-dm text-[10px] font-bold uppercase tracking-wide hover:opacity-90 ${orderStageBadgeClass(o.stage)}`}
          >
            {t(`stagesShort.${o.stage}`)}
          </button>
          <span className="font-dm text-[10px] text-eoi-ink2">{formatDate(locale, o.created_at)}</span>
        </div>
        <Link
          href={`/admin/orders/${o.id}`}
          className="mt-2 block text-center font-dm text-[10px] font-semibold text-eoi-pink hover:underline"
        >
          {t("admin.orders.view")}
        </Link>
      </div>
      <OrderStageQuickDialog
        mounted={mounted}
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        orderId={o.id}
        stage={o.stage}
        refLabel={ref}
      />
      <OrderPreviewQuickDialog
        mounted={mounted}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        orderId={o.id}
        refLabel={ref}
        locale={locale}
      />
    </>
  );
}
