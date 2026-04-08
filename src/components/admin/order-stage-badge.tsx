import type { OrderStage } from "@/types/database";
import { orderStageBadgeClass } from "@/lib/order-stage-entered-at";
import { getServerI18n } from "@/lib/server-i18n";

export { orderStageBadgeClass };

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
