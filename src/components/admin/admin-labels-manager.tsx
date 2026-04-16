"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/locale-provider";

type Label = {
  id: string;
  name: string;
  color: string;
  description: string | null;
};

export function AdminLabelsManager() {
  const t = useTranslations();
  const [labels, setLabels] = useState<Label[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/labels");
      const json = (await res.json()) as { labels?: Label[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? t("admin.labels.errorLoad"));
      setLabels(json.labels ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.labels.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createLabel() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, description: description.trim() || null }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? t("admin.labels.errorCreate"));
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.labels.errorCreate"));
      setLoading(false);
    }
  }

  async function removeLabel(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/labels/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? t("admin.labels.errorDelete"));
      return;
    }
    await load();
  }

  return (
    <div className="mt-4 rounded-2xl border border-eoi-border bg-eoi-surface p-4 shadow-sm">
      <h2 className="font-syne text-lg font-bold text-eoi-ink">{t("admin.labels.panelTitle")}</h2>
      <p className="mt-1 font-dm text-xs text-eoi-ink2">{t("admin.labels.panelHint")}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("admin.labels.fieldName")}
          className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink sm:col-span-1"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-[40px] w-full rounded-[10px] border border-eoi-border bg-eoi-surface p-1"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("admin.labels.fieldDescription")}
          className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink sm:col-span-2"
        />
      </div>
      <button
        type="button"
        onClick={() => void createLabel()}
        disabled={loading}
        className="mt-3 min-h-[40px] rounded-full bg-eoi-ink px-4 py-2 font-dm text-xs font-semibold text-white disabled:opacity-60"
      >
        {t("admin.labels.create")}
      </button>

      {error ? <p className="mt-3 font-dm text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {labels.map((l) => (
          <div key={l.id} className="inline-flex items-center gap-2 rounded-full border border-eoi-border bg-eoi-surface px-2.5 py-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="font-dm text-xs font-medium text-eoi-ink">{l.name}</span>
            <button
              type="button"
              onClick={() => void removeLabel(l.id)}
              className="font-dm text-xs text-red-600 hover:underline"
            >
              {t("admin.labels.remove")}
            </button>
          </div>
        ))}
        {!loading && labels.length === 0 ? (
          <p className="font-dm text-sm text-eoi-ink2">{t("admin.labels.empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
