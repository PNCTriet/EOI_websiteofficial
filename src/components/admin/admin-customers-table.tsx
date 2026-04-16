"use client";

import { useMemo, useState } from "react";
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
import { formatDate, formatPrice } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";
import { orderStageBadgeClass } from "@/lib/order-stage-entered-at";
import type { OrderStage } from "@/types/database";

export type CustomerRelatedOrder = {
  id: string;
  ref: string;
  createdAt: string;
  stage: OrderStage;
  totalAmount: number;
};

export type CustomerRow = {
  emailKey: string;
  emailDisplay: string;
  names: string[];
  phoneDisplay: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  relatedOrders: CustomerRelatedOrder[];
};

type Labels = {
  noCustomers: string;
  tableName: string;
  tableEmail: string;
  tablePhone: string;
  tableOrderCount: string;
  tableTotalSpent: string;
  tableLastOrder: string;
  searchPlaceholder: string;
  filterName: string;
  filterEmail: string;
  filterPhone: string;
  filterMinOrders: string;
  filterMinSpent: string;
  clearFilters: string;
  popupTitle: string;
  popupClose: string;
  popupRelatedOrders: string;
  popupCustomerInfo: string;
  popupTotalSpent: string;
  popupOrderCount: string;
  popupRefCol: string;
  popupDateCol: string;
  popupStageCol: string;
  popupTotalCol: string;
  stageLabels: Record<OrderStage, string>;
};

type Props = {
  locale: Locale;
  rows: CustomerRow[];
  labels: Labels;
};

export function AdminCustomersTable({ locale, rows, labels }: Props) {
  const [search, setSearch] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [minSpent, setMinSpent] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const n = nameFilter.trim().toLowerCase();
    const e = emailFilter.trim().toLowerCase();
    const p = phoneFilter.trim().toLowerCase();
    const minO = Number(minOrders);
    const minS = Number(minSpent);

    return rows.filter((row) => {
      const namesJoin = row.names.join(" · ");
      const haystack = `${namesJoin} ${row.emailDisplay} ${row.phoneDisplay}`.toLowerCase();
      if (s && !haystack.includes(s)) return false;
      if (n && !namesJoin.toLowerCase().includes(n)) return false;
      if (e && !row.emailDisplay.toLowerCase().includes(e)) return false;
      if (p && !row.phoneDisplay.toLowerCase().includes(p)) return false;
      if (Number.isFinite(minO) && minOrders.trim() && row.orderCount < minO) return false;
      if (Number.isFinite(minS) && minSpent.trim() && row.totalSpent < minS) return false;
      return true;
    });
  }, [rows, search, nameFilter, emailFilter, phoneFilter, minOrders, minSpent]);

  const active = filtered.find((r) => r.emailKey === activeKey) ?? rows.find((r) => r.emailKey === activeKey) ?? null;

  function compactNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? "—";
    return `${names[0]} (+${names.length - 1})`;
  }

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

  function clearFilters() {
    setSearch("");
    setNameFilter("");
    setEmailFilter("");
    setPhoneFilter("");
    setMinOrders("");
    setMinSpent("");
  }

  return (
    <>
      <div className="mt-4 rounded-2xl border border-eoi-border bg-eoi-surface p-3 shadow-sm sm:mt-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink lg:col-span-2"
          />
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={labels.filterName}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
          />
          <input
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder={labels.filterEmail}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
          />
          <input
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            placeholder={labels.filterPhone}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
          />
          <div className="flex gap-2">
            <input
              value={minOrders}
              onChange={(e) => setMinOrders(e.target.value)}
              placeholder={labels.filterMinOrders}
              inputMode="numeric"
              className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
            />
            <input
              value={minSpent}
              onChange={(e) => setMinSpent(e.target.value)}
              placeholder={labels.filterMinSpent}
              inputMode="numeric"
              className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-2 rounded-full border border-eoi-border px-3 py-1.5 font-dm text-xs text-eoi-ink2 hover:text-eoi-ink"
        >
          {labels.clearFilters}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-2xl border border-eoi-border bg-eoi-surface shadow-sm">
        <table className="w-full min-w-[900px] text-left font-dm text-sm">
          <thead>
            <tr className="border-b border-eoi-border bg-eoi-surface/80">
              <th className="px-4 py-3 font-medium text-eoi-ink2">{labels.tableName}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{labels.tableEmail}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{labels.tablePhone}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{labels.tableOrderCount}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{labels.tableTotalSpent}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{labels.tableLastOrder}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-eoi-ink2">
                  {labels.noCustomers}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={row.emailKey}
                  className={`${i % 2 === 1 ? "bg-eoi-surface/50" : ""} cursor-pointer hover:bg-eoi-pink-light/20`}
                  onClick={() => setActiveKey(row.emailKey)}
                >
                  <td className="px-4 py-3 font-medium text-eoi-ink" title={row.names.join(" · ")}>
                    {compactNames(row.names)}
                  </td>
                  <td className="px-4 py-3 text-eoi-ink2">{row.emailDisplay}</td>
                  <td className="px-4 py-3 text-eoi-ink2">{row.phoneDisplay}</td>
                  <td className="px-4 py-3 text-eoi-ink">{row.orderCount}</td>
                  <td className="px-4 py-3 text-eoi-ink">{formatPrice(locale, row.totalSpent)}</td>
                  <td className="px-4 py-3 text-eoi-ink2">{formatDate(locale, row.lastOrderAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[max(1rem,7vh)] backdrop-blur-[1px]"
          onClick={() => setActiveKey(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-eoi-border bg-eoi-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-syne text-lg font-bold text-eoi-ink">{labels.popupTitle}</h3>
              <button
                type="button"
                onClick={() => setActiveKey(null)}
                className="rounded-full border border-eoi-border px-3 py-1.5 font-dm text-xs text-eoi-ink2 hover:text-eoi-ink"
              >
                {labels.popupClose}
              </button>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-eoi-border bg-eoi-surface/60 p-3 sm:grid-cols-2">
              <div>
                <p className="font-dm text-[11px] uppercase text-eoi-ink2">{labels.popupCustomerInfo}</p>
                <p className="mt-1 font-dm text-sm text-eoi-ink">{active.names.join(" · ")}</p>
                <p className="font-dm text-sm text-eoi-ink2">{active.emailDisplay}</p>
                <p className="font-dm text-sm text-eoi-ink2">{active.phoneDisplay}</p>
              </div>
              <div>
                <p className="font-dm text-[11px] uppercase text-eoi-ink2">{labels.popupOrderCount}</p>
                <p className="mt-1 font-syne text-lg font-bold text-eoi-ink">{active.orderCount}</p>
                <p className="mt-2 font-dm text-[11px] uppercase text-eoi-ink2">{labels.popupTotalSpent}</p>
                <p className="mt-1 font-syne text-lg font-bold text-eoi-ink">{formatPrice(locale, active.totalSpent)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-dm text-xs font-semibold uppercase text-eoi-ink2">
                {labels.popupRelatedOrders}
              </p>
              <div className="max-h-[45vh] overflow-auto rounded-xl border border-eoi-border">
                <table className="w-full min-w-[620px] text-left font-dm text-sm">
                  <thead>
                    <tr className="border-b border-eoi-border bg-eoi-surface/80">
                      <th className="px-3 py-2 font-medium text-eoi-ink2">{labels.popupRefCol}</th>
                      <th className="px-3 py-2 font-medium text-eoi-ink2">{labels.popupDateCol}</th>
                      <th className="px-3 py-2 font-medium text-eoi-ink2">{labels.popupStageCol}</th>
                      <th className="px-3 py-2 font-medium text-eoi-ink2">{labels.popupTotalCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.relatedOrders.map((o, idx) => (
                      <tr key={`${o.id}-${idx}`} className={idx % 2 === 1 ? "bg-eoi-surface/40" : ""}>
                        <td className="px-3 py-2 font-medium text-eoi-ink">{o.ref}</td>
                        <td className="px-3 py-2 text-eoi-ink2">{formatDate(locale, o.createdAt, true)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-dm text-[10px] font-bold uppercase tracking-wide ${orderStageBadgeClass(o.stage)}`}
                          >
                            {(() => {
                              const Icon = stageIcon(o.stage);
                              return <Icon size={12} strokeWidth={2.2} aria-hidden />;
                            })()}
                            {labels.stageLabels[o.stage]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-eoi-ink">{formatPrice(locale, o.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
