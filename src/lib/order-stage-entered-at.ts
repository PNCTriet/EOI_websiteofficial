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

// --- Visual tokens: badge / timeline / hovers (Tailwind) --------------------

/**
 * Pill badge — nền đặc, dễ phân biệt:
 * chờ TT = amber, đã TT = sky, xử lý = vàng (chữ tối), giao = emerald, huỷ = đỏ, hết hạn = stone.
 */
export function orderStageBadgeClass(stage: OrderStage): string {
  switch (stage) {
    case "pending_payment":
      return "bg-amber-600 text-white shadow-sm";
    case "paid":
      return "bg-sky-600 text-white shadow-sm";
    case "processing":
    case "printing":
      return "bg-yellow-500 text-neutral-900 shadow-sm font-extrabold";
    case "shipped":
    case "delivered":
      return "bg-emerald-600 text-white shadow-sm";
    case "cancelled":
      return "bg-red-600 text-white shadow-sm";
    case "expired":
      return "bg-stone-600 text-white shadow-sm";
    default:
      return "bg-stone-500 text-white shadow-sm";
  }
}

/** Panel lịch sử — nền màu đậm (opacity) + cạnh trái đặc, đồng bộ palette badge. */
export function orderStageHistorySurfaceClass(stage: OrderStage): string {
  switch (stage) {
    case "pending_payment":
      return "border-l-[6px] border-l-amber-600 bg-amber-500/20";
    case "paid":
      return "border-l-[6px] border-l-sky-600 bg-sky-500/20";
    case "processing":
    case "printing":
      return "border-l-[6px] border-l-yellow-500 bg-yellow-400/25";
    case "shipped":
    case "delivered":
      return "border-l-[6px] border-l-emerald-600 bg-emerald-500/20";
    case "cancelled":
      return "border-l-[6px] border-l-red-600 bg-red-500/20";
    case "expired":
      return "border-l-[6px] border-l-stone-600 bg-stone-500/15";
    default:
      return "border-l-[6px] border-l-eoi-border bg-eoi-surface/60";
  }
}

/** Dot on vertical timeline (matches `to_stage`). */
export function orderStageTimelineDotClass(stage: OrderStage): string {
  switch (stage) {
    case "pending_payment":
      return "bg-amber-500";
    case "paid":
      return "bg-sky-500";
    case "processing":
    case "printing":
      return "bg-yellow-500";
    case "shipped":
    case "delivered":
      return "bg-emerald-500";
    case "cancelled":
      return "bg-red-500";
    case "expired":
      return "bg-stone-500";
    default:
      return "bg-eoi-pink";
  }
}

/** Hover: viền (ring) + phóng nhẹ — dùng cho lịch sử stage (không đè border-l accent). */
export const orderStageCardHoverClass =
  "cursor-default transition-all duration-200 ease-out hover:z-[1] hover:scale-[1.02] hover:shadow-md hover:ring-2 hover:ring-eoi-pink/40";

/** Hover cho ô đơn / intent trong danh sách tài khoản (có viền sẵn). */
export const orderStageListLinkHoverClass =
  "cursor-pointer transition-all duration-200 ease-out hover:z-[1] hover:scale-[1.02] hover:border-eoi-pink/45 hover:shadow-md hover:ring-2 hover:ring-eoi-pink/25";

/** Admin: nút chuyển stage — cùng palette nền đặc với badge. */
export function orderStagePipelineButtonClass(stage: OrderStage, isCurrent: boolean): string {
  const base =
    "rounded-full px-3 py-2 font-dm text-xs font-semibold min-h-[40px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.99] shadow-sm";
  if (isCurrent) {
    return `${base} bg-eoi-ink text-white ring-2 ring-eoi-ink/25`;
  }
  if (stage === "cancelled") {
    return `${base} bg-red-600 text-white hover:bg-red-700`;
  }
  switch (stage) {
    case "pending_payment":
      return `${base} bg-amber-600 text-white hover:bg-amber-700`;
    case "paid":
      return `${base} bg-sky-600 text-white hover:bg-sky-700`;
    case "processing":
    case "printing":
      return `${base} bg-yellow-500 text-neutral-900 hover:bg-yellow-400`;
    case "shipped":
    case "delivered":
      return `${base} bg-emerald-600 text-white hover:bg-emerald-700`;
    case "expired":
      return `${base} bg-stone-600 text-white hover:bg-stone-700`;
    default:
      return `${base} border border-eoi-border bg-white text-eoi-ink2 hover:border-eoi-ink/30 hover:text-eoi-ink`;
  }
}
