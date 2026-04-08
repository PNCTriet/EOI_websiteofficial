"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { OrderPreviewQuickDialog, OrderStageQuickDialog } from "@/components/admin/admin-order-quick-dialogs";
import { useTranslations } from "@/components/locale-provider";
import { formatDate, formatPrice } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";
import { orderStageBadgeClass } from "@/lib/order-stage-entered-at";
import type { OrderStage } from "@/types/database";

export type AdminOrdersTableRowOrder = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  displayName: string;
};

type Props = {
  order: AdminOrdersTableRowOrder;
  locale: Locale;
  rowIndex: number;
};

export function AdminOrdersTableRow({ order, locale, rowIndex }: Props) {
  const t = useTranslations();
  const ref = order.sepay_ref ?? order.id.slice(0, 8);
  const [mounted, setMounted] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rowBg = rowIndex % 2 === 1 ? "bg-eoi-surface/50" : "";

  return (
    <>
      <tr className={rowBg}>
        <td className="px-4 py-3 font-medium text-eoi-ink">{ref}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="max-w-[220px] text-left font-dm text-sm text-eoi-ink underline-offset-2 hover:text-eoi-pink-dark hover:underline sm:max-w-xs"
          >
            {order.displayName}
          </button>
        </td>
        <td className="px-4 py-3 font-medium text-eoi-ink">
          {formatPrice(locale, order.total_amount)}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setStageOpen(true)}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-full px-2.5 py-1.5 font-dm text-[10px] font-bold uppercase tracking-wide transition hover:opacity-90 ${orderStageBadgeClass(order.stage)}`}
          >
            {t(`stagesShort.${order.stage}`)}
          </button>
        </td>
        <td className="px-4 py-3 text-eoi-ink2">{formatDate(locale, order.created_at)}</td>
        <td className="px-4 py-3">
          <Link
            href={`/admin/orders/${order.id}`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-eoi-ink hover:bg-eoi-surface"
            aria-label={t("admin.orders.viewAria")}
          >
            <Eye size={18} strokeWidth={2} />
          </Link>
        </td>
      </tr>
      <OrderStageQuickDialog
        mounted={mounted}
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        orderId={order.id}
        stage={order.stage}
        refLabel={ref}
      />
      <OrderPreviewQuickDialog
        mounted={mounted}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        orderId={order.id}
        refLabel={ref}
        locale={locale}
      />
    </>
  );
}
