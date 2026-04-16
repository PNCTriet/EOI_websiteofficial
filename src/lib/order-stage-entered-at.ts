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
      return "bg-amber-500 text-white shadow-sm dark:bg-amber-400 dark:text-amber-950";
    case "paid":
      return "bg-sky-500 text-white shadow-sm dark:bg-sky-400 dark:text-sky-950";
    case "processing":
      return "bg-yellow-400 text-yellow-950 shadow-sm font-semibold dark:bg-yellow-300 dark:text-yellow-950";
    case "printing":
      return "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white";
    case "shipped":
      return "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500 dark:text-white";
    case "delivered":
      return "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-white";
    case "cancelled":
      return "bg-rose-600 text-white shadow-sm dark:bg-rose-500 dark:text-white";
    case "expired":
      return "bg-slate-600 text-white shadow-sm dark:bg-slate-500 dark:text-white";
    default:
      return "bg-slate-600 text-white shadow-sm dark:bg-slate-500 dark:text-white";
  }
}

/** Panel lịch sử — nền màu đậm (opacity) + cạnh trái đặc, đồng bộ palette badge. */
export function orderStageHistorySurfaceClass(stage: OrderStage): string {
  switch (stage) {
    case "pending_payment":
      return "border-l-[6px] border-l-amber-500 bg-amber-500/20 dark:bg-amber-400/25";
    case "paid":
      return "border-l-[6px] border-l-sky-500 bg-sky-500/20 dark:bg-sky-400/25";
    case "processing":
      return "border-l-[6px] border-l-yellow-500 bg-yellow-400/25 dark:bg-yellow-300/30";
    case "printing":
      return "border-l-[6px] border-l-blue-600 bg-blue-500/20 dark:bg-blue-400/25";
    case "shipped":
      return "border-l-[6px] border-l-indigo-600 bg-indigo-500/20 dark:bg-indigo-400/25";
    case "delivered":
      return "border-l-[6px] border-l-emerald-600 bg-emerald-500/20 dark:bg-emerald-500/25";
    case "cancelled":
      return "border-l-[6px] border-l-rose-600 bg-rose-500/20 dark:bg-rose-400/25";
    case "expired":
      return "border-l-[6px] border-l-slate-600 bg-slate-500/20 dark:bg-slate-400/25";
    default:
      return "border-l-[6px] border-l-eoi-border bg-eoi-surface/60";
  }
}

/** Dot on vertical timeline (matches `to_stage`). */
export function orderStageTimelineDotClass(stage: OrderStage): string {
  switch (stage) {
    case "pending_payment":
      return "bg-amber-500 dark:bg-amber-400";
    case "paid":
      return "bg-sky-500 dark:bg-sky-400";
    case "processing":
      return "bg-yellow-500 dark:bg-yellow-400";
    case "printing":
      return "bg-blue-600 dark:bg-blue-500";
    case "shipped":
      return "bg-indigo-600 dark:bg-indigo-500";
    case "delivered":
      return "bg-emerald-500 dark:bg-emerald-500";
    case "cancelled":
      return "bg-rose-600 dark:bg-rose-500";
    case "expired":
      return "bg-slate-600 dark:bg-slate-500";
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
  const currentRing = isCurrent ? " ring-2 ring-eoi-pink/45 dark:ring-white/40" : "";
  if (stage === "cancelled") {
    return `${base} bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:text-white${currentRing}`;
  }
  switch (stage) {
    case "pending_payment":
      return `${base} bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-amber-950${currentRing}`;
    case "paid":
      return `${base} bg-sky-500 text-white hover:bg-sky-600 dark:bg-sky-400 dark:text-sky-950${currentRing}`;
    case "processing":
      return `${base} bg-yellow-400 text-yellow-950 hover:bg-yellow-500 dark:bg-yellow-300 dark:text-yellow-950${currentRing}`;
    case "printing":
      return `${base} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white${currentRing}`;
    case "shipped":
      return `${base} bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:text-white${currentRing}`;
    case "delivered":
      return `${base} bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white${currentRing}`;
    case "expired":
      return `${base} bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-500 dark:text-white${currentRing}`;
    default:
      return `${base} bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-500 dark:text-white${currentRing}`;
  }
}
