import type { OrderStage } from "@/types/database";

/** Four customer-facing checkpoints (fewer than internal OrderStage). */
export type UserOrderPhaseKey = "payment" | "preparing" | "shipping" | "done";

export function orderStageToUserPhase(stage: OrderStage): UserOrderPhaseKey | "closed" {
  switch (stage) {
    case "pending_payment":
      return "payment";
    case "paid":
    case "processing":
    case "printing":
      return "preparing";
    case "shipped":
      return "shipping";
    case "delivered":
      return "done";
    case "cancelled":
    case "expired":
      return "closed";
    default:
      return "preparing";
  }
}

/**
 * 0 = pending payment; 1–4 = completed checkpoints on the 4-step customer bar.
 * (1 = paid, 2 = in production, 3 = shipped, 4 = delivered)
 */
export function userPhaseProgress(stage: OrderStage): 0 | 1 | 2 | 3 | 4 {
  switch (stage) {
    case "pending_payment":
      return 0;
    case "paid":
      return 1;
    case "processing":
    case "printing":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    case "cancelled":
    case "expired":
      return 0;
    default:
      return 0;
  }
}
