import type { OrderStage } from "@/types/database";

/**
 * Target hours per stage for SLA coloring (admin). Adjust as needed.
 */
export const ORDER_STAGE_SLA_HOURS: Partial<Record<OrderStage, number>> = {
  pending_payment: 24,
  paid: 48,
  processing: 72,
  printing: 120,
  shipped: 168,
  delivered: 0,
  expired: 0,
  cancelled: 0,
};

export function slaHoursForStage(stage: OrderStage): number | null {
  const h = ORDER_STAGE_SLA_HOURS[stage];
  if (h == null || h <= 0) return null;
  return h;
}
