"use client";

import { useEffect, useState } from "react";

type Label = { id: string; name: string; color: string };

export function AdminOrderLabelsInline({ orderId }: { orderId: string }) {
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [assigned, setAssigned] = useState<Label[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [allRes, assignedRes] = await Promise.all([
        fetch("/api/admin/labels"),
        fetch(`/api/admin/orders/${orderId}/labels`),
      ]);
      const allJson = (await allRes.json()) as { labels?: Label[] };
      const assignedJson = (await assignedRes.json()) as { labels?: Label[] };
      setAllLabels(allJson.labels ?? []);
      setAssigned(assignedJson.labels ?? []);
    })();
  }, [orderId]);

  const assignedSet = new Set(assigned.map((x) => x.id));

  async function toggle(label: Label) {
    setBusyId(label.id);
    const has = assignedSet.has(label.id);
    const url = has
      ? `/api/admin/orders/${orderId}/labels/${label.id}`
      : `/api/admin/orders/${orderId}/labels`;
    const init = has
      ? { method: "DELETE" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label_id: label.id }),
        };
    const res = await fetch(url, init);
    if (res.ok) {
      setAssigned((prev) =>
        has ? prev.filter((l) => l.id !== label.id) : [...prev, label]
      );
    }
    setBusyId(null);
  }

  if (allLabels.length === 0) {
    return <span className="font-dm text-xs text-eoi-ink2">—</span>;
  }

  return (
    <div className="flex max-w-[260px] flex-wrap gap-1">
      {allLabels.map((label) => {
        const active = assignedSet.has(label.id);
        return (
          <button
            key={label.id}
            type="button"
            disabled={busyId === label.id}
            onClick={() => void toggle(label)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-dm text-[10px] font-semibold ${
              active ? "border-transparent text-white" : "border-eoi-border text-eoi-ink2"
            }`}
            style={active ? { backgroundColor: label.color } : undefined}
            title={label.name}
          >
            {label.name}
          </button>
        );
      })}
    </div>
  );
}
