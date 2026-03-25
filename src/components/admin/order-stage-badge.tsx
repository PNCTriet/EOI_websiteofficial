import type { OrderStage } from "@/types/database";
import { getServerI18n } from "@/lib/server-i18n";

export function orderStageBadgeClass(stage: OrderStage): string {
  switch (stage) {
    case "pending_payment":
      return "bg-eoi-amber-light text-eoi-amber-dark";
    case "paid":
      return "bg-eoi-blue-light text-eoi-blue-dark";
    case "processing":
    case "printing":
      return "bg-eoi-pink-light text-eoi-pink-dark";
    case "shipped":
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "expired":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-eoi-border text-eoi-ink2";
  }
}

export async function OrderStageBadge({ stage }: { stage: OrderStage }) {
  const { t } = await getServerI18n();
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-dm text-[10px] font-bold uppercase tracking-wide ${orderStageBadgeClass(stage)}`}
    >
      {t(`stagesShort.${stage}`)}
    </span>
  );
}
