import {
  Clock3,
  CircleDollarSign,
  Cog,
  Printer,
  Truck,
  PackageCheck,
  XCircle,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import type { OrderStage } from "@/types/database";
import { orderStageBadgeClass } from "@/lib/order-stage-entered-at";
import { getServerI18n } from "@/lib/server-i18n";

export { orderStageBadgeClass };

function stageIcon(stage: OrderStage): LucideIcon {
  switch (stage) {
    case "pending_payment":
      return Clock3;
    case "paid":
      return CircleDollarSign;
    case "processing":
      return Cog;
    case "printing":
      return Printer;
    case "shipped":
      return Truck;
    case "delivered":
      return PackageCheck;
    case "cancelled":
      return XCircle;
    case "expired":
      return TimerOff;
    default:
      return Clock3;
  }
}

export async function OrderStageBadge({
  stage,
  withIcon = false,
}: {
  stage: OrderStage;
  withIcon?: boolean;
}) {
  const { t } = await getServerI18n();
  const Icon = stageIcon(stage);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-dm text-[10px] font-bold uppercase tracking-wide ${orderStageBadgeClass(stage)}`}
    >
      {withIcon ? <Icon size={12} strokeWidth={2.1} aria-hidden /> : null}
      {t(`stagesShort.${stage}`)}
    </span>
  );
}
