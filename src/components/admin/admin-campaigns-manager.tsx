"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/locale-provider";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: string;
};

export function AdminCampaignsManager() {
  const t = useTranslations();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns");
      const json = (await res.json()) as { campaigns?: Campaign[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? t("admin.campaigns.errorLoad"));
      setCampaigns(json.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.campaigns.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCampaign() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? t("admin.campaigns.errorCreate"));
      setName("");
      setDescription("");
      setStatus("active");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.campaigns.errorCreate"));
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-eoi-border bg-eoi-surface p-4 shadow-sm">
      <h2 className="font-syne text-lg font-bold text-eoi-ink">{t("admin.campaigns.panelTitle")}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("admin.campaigns.fieldName")}
          className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("admin.campaigns.fieldDescription")}
          className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink sm:col-span-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
        >
          <option value="active">{t("admin.campaigns.statusActive")}</option>
          <option value="planned">{t("admin.campaigns.statusPlanned")}</option>
          <option value="closed">{t("admin.campaigns.statusClosed")}</option>
        </select>
      </div>
      <button
        type="button"
        onClick={() => void createCampaign()}
        disabled={loading}
        className="mt-3 min-h-[40px] rounded-full bg-eoi-ink px-4 py-2 font-dm text-xs font-semibold text-white disabled:opacity-60"
      >
        {t("admin.campaigns.create")}
      </button>

      {error ? <p className="mt-2 font-dm text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-eoi-border">
        <table className="w-full min-w-[560px] text-left font-dm text-sm">
          <thead>
            <tr className="border-b border-eoi-border bg-eoi-surface/80">
              <th className="px-3 py-2 font-medium text-eoi-ink2">{t("admin.campaigns.colName")}</th>
              <th className="px-3 py-2 font-medium text-eoi-ink2">{t("admin.campaigns.colStatus")}</th>
              <th className="px-3 py-2 font-medium text-eoi-ink2">{t("admin.campaigns.colStart")}</th>
              <th className="px-3 py-2 font-medium text-eoi-ink2">{t("admin.campaigns.colEnd")}</th>
              <th className="px-3 py-2 font-medium text-eoi-ink2">{t("admin.campaigns.colDescription")}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-eoi-border/60">
                <td className="px-3 py-2 font-medium text-eoi-ink">{c.name}</td>
                <td className="px-3 py-2 text-eoi-ink2">{c.status}</td>
                <td className="px-3 py-2 text-eoi-ink2">{c.started_at?.slice(0, 10) ?? "—"}</td>
                <td className="px-3 py-2 text-eoi-ink2">{c.ended_at?.slice(0, 10) ?? "—"}</td>
                <td className="px-3 py-2 text-eoi-ink2">{c.description ?? "—"}</td>
              </tr>
            ))}
            {!loading && campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-eoi-ink2">
                  {t("admin.campaigns.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
