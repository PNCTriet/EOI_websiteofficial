import type { OrderStage } from "@/types/database";

/** Linear fulfillment after payment (no skipping). */
export const FULFILLMENT_CHAIN: OrderStage[] = [
  "pending_payment",
  "paid",
  "processing",
  "printing",
  "shipped",
  "delivered",
];

/** Bước tiếp theo trên luồng giao hàng (một bước), hoặc null nếu đã cuối / terminal. */
export function nextLinearStage(from: OrderStage): OrderStage | null {
  const i = FULFILLMENT_CHAIN.indexOf(from);
  if (i < 0 || i >= FULFILLMENT_CHAIN.length - 1) return null;
  return FULFILLMENT_CHAIN[i + 1]!;
}

const TERMINAL: OrderStage[] = ["expired", "cancelled"];

export function isTerminalStage(stage: OrderStage): boolean {
  return TERMINAL.includes(stage);
}

/** Stages an admin may move to from this stage (single step forward, or cancel where allowed). */
export function allowedTargetStages(from: OrderStage): OrderStage[] {
  if (from === "expired" || from === "cancelled" || from === "delivered") return [];

  const canCancel = ["pending_payment", "paid", "processing", "printing"].includes(from);

  const linearNext = (): OrderStage | null => nextLinearStage(from);

  const next = linearNext();
  const out: OrderStage[] = [];
  if (next) out.push(next);
  if (canCancel) out.push("cancelled");
  return out;
}

export function isTransitionAllowed(from: OrderStage, to: OrderStage): boolean {
  return allowedTargetStages(from).includes(to);
}

export function requiresTrackingForTransition(to: OrderStage): boolean {
  return to === "shipped";
}
