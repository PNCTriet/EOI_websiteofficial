import type { OrderStage } from "@/types/database";

/** Linear fulfillment after payment (no skipping). */
const FULFILLMENT: OrderStage[] = [
  "pending_payment",
  "paid",
  "processing",
  "printing",
  "shipped",
  "delivered",
];

const TERMINAL: OrderStage[] = ["expired", "cancelled"];

export function isTerminalStage(stage: OrderStage): boolean {
  return TERMINAL.includes(stage);
}

/** Stages an admin may move to from this stage (single step forward, or cancel where allowed). */
export function allowedTargetStages(from: OrderStage): OrderStage[] {
  if (from === "expired" || from === "cancelled" || from === "delivered") return [];

  const canCancel = ["pending_payment", "paid", "processing", "printing"].includes(from);

  const linearNext = (): OrderStage | null => {
    const i = FULFILLMENT.indexOf(from);
    if (i < 0 || i >= FULFILLMENT.length - 1) return null;
    return FULFILLMENT[i + 1]!;
  };

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
