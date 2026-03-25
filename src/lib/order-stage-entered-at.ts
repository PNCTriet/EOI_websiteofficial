import type { OrderStage, OrderStageLogRow } from "@/types/database";

/**
 * When the order entered its current stage (from logs), else order creation time.
 */
export function enteredCurrentStageAt(
  orderStage: OrderStage,
  orderCreatedAt: string,
  logs: Pick<OrderStageLogRow, "to_stage" | "created_at">[]
): string {
  let last: string | null = null;
  for (const log of logs) {
    if (log.to_stage === orderStage) {
      last = log.created_at;
    }
  }
  if (last) return last;
  return orderCreatedAt;
}
