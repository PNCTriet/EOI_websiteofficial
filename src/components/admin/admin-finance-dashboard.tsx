"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/locale-provider";

type Campaign = { id: string; name: string };
type Pnl = {
  revenue: number;
  material_cost: number;
  operational_cost: number;
  equipment_cost: number;
  profit: number;
};

function money(v: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);
}

export function AdminFinanceDashboard() {
  const t = useTranslations();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/campaigns");
      const json = (await res.json()) as { campaigns?: Campaign[] };
      setCampaigns(json.campaigns ?? []);
    })();
  }, []);

  async function loadPnl(id: string) {
    setLoading(true);
    setError(null);
    try {
      const qs = id ? `?campaign_id=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/admin/finance/pnl${qs}`);
      const json = (await res.json()) as Pnl & { error?: string };
      if (!res.ok) throw new Error(json.error ?? t("admin.finance.errorLoad"));
      setPnl(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.finance.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPnl("");
  }, []);

  return (
    <div className="mt-4 rounded-2xl border border-eoi-border bg-eoi-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="font-dm text-xs text-eoi-ink2">{t("admin.finance.filterCampaign")}</label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="mt-1 w-[220px] rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
          >
            <option value="">{t("admin.finance.filterAllCampaigns")}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void loadPnl(campaignId)}
          className="min-h-[40px] rounded-full bg-eoi-ink px-4 py-2 font-dm text-xs font-semibold text-white"
        >
          {t("admin.finance.refresh")}
        </button>
      </div>

      {error ? <p className="mt-3 font-dm text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-3 font-dm text-sm text-eoi-ink2">{t("common.loading")}</p> : null}

      {pnl ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [t("admin.finance.revenue"), pnl.revenue],
            [t("admin.finance.materialCost"), pnl.material_cost],
            [t("admin.finance.operationalCost"), pnl.operational_cost],
            [t("admin.finance.equipmentCost"), pnl.equipment_cost],
            [t("admin.finance.profit"), pnl.profit],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-eoi-border bg-eoi-surface p-3">
              <p className="font-dm text-[11px] uppercase text-eoi-ink2">{label}</p>
              <p className="mt-1 font-syne text-base font-bold text-eoi-ink">{money(Number(value))}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
