"use client";

import { useCallback, useEffect, useState } from "react";

type Template = {
  key: string;
  name: string;
  subject: string;
  html: string;
  enabled: boolean;
  updated_at: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  last_error?: string | null;
  sent_at: string | null;
  created_at: string;
};

type EmailLog = {
  id: string;
  status: string;
  recipient_email: string;
  subject: string;
  created_at: string;
  provider_message_id: string | null;
  event_type: string;
  error?: string | null;
};

export function AdminEmailCenter() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [audience, setAudience] = useState<"all_customers" | "paid_customers" | "custom">("all_customers");
  const [customRecipients, setCustomRecipients] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewVarsRaw, setReviewVarsRaw] = useState(
    JSON.stringify(
      {
        order_ref: "EOI-ABC123",
        order_total: "499000 VND",
        shipping_carrier: "GHTK",
        tracking_number: "GHTK123456789",
        recipient_name: "Linh",
        site_url: "https://eoi.vn",
      },
      null,
      2
    )
  );

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/email/templates");
    const data = (await res.json()) as { templates?: Template[] };
    const list = data.templates ?? [];
    setTemplates(list);
    if (!selectedKey && list.length > 0) {
      pickTemplate(list[0]);
    }
  }, [selectedKey]);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/admin/email/dashboard");
    const data = (await res.json()) as {
      counts?: Record<string, number>;
      campaigns?: Campaign[];
      logs?: EmailLog[];
    };
    setCounts(data.counts ?? {});
    setCampaigns(data.campaigns ?? []);
    setLogs(data.logs ?? []);
  }, []);

  useEffect(() => {
    void loadTemplates();
    void loadDashboard();
    const id = window.setInterval(() => void loadDashboard(), 10000);
    return () => window.clearInterval(id);
  }, [loadDashboard, loadTemplates]);

  function pickTemplate(t: Template) {
    setSelectedKey(t.key);
    setName(t.name);
    setSubject(t.subject);
    setHtml(t.html);
    setEnabled(t.enabled);
  }

  async function saveTemplate() {
    if (!selectedKey) return;
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/admin/email/templates/${selectedKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, html, enabled }),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved template." : "Failed to save template.");
    await loadTemplates();
  }

  async function sendCampaign() {
    if (!selectedKey) return;
    setSending(true);
    setMessage("");
    const res = await fetch("/api/admin/email/campaigns/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: campaignName || `Campaign ${new Date().toLocaleString()}`,
        templateKey: selectedKey,
        audience,
        customRecipients: customRecipients
          .split(/[,\n]/)
          .map((x) => x.trim())
          .filter(Boolean),
      }),
    });
    const data = (await res.json()) as {
      recipientCount?: number;
      sentCount?: number;
      failedCount?: number;
      failedSamples?: string[];
    };
    setSending(false);
    if (res.ok) {
      setMessage(
        `Campaign sent. Recipients: ${data.recipientCount ?? 0}, sent: ${data.sentCount ?? 0}, failed: ${data.failedCount ?? 0}${
          (data.failedSamples?.length ?? 0) > 0 ? `. Sample: ${data.failedSamples?.join(" | ")}` : ""
        }.`
      );
      await loadDashboard();
    } else {
      setMessage("Failed to send campaign.");
    }
  }

  function interpolateTemplate(source: string, variables: Record<string, unknown>) {
    return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
      const value = variables[key];
      return value == null ? "" : String(value);
    });
  }

  const reviewVars = (() => {
    try {
      const parsed = JSON.parse(reviewVarsRaw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  })();
  const reviewedSubject = reviewVars ? interpolateTemplate(subject, reviewVars) : "";
  const reviewedHtml = reviewVars ? interpolateTemplate(html, reviewVars) : "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {["sent", "delivered", "opened", "clicked", "bounced", "failed"].map((k) => (
          <div key={k} className="rounded-xl border border-eoi-border bg-white p-3">
            <p className="font-dm text-xs uppercase text-eoi-ink2">{k}</p>
            <p className="font-syne text-2xl font-bold text-eoi-ink">{counts[k] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
          <p className="font-syne text-lg font-bold text-eoi-ink">Templates</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTemplate(t)}
                className={`rounded-full px-3 py-1.5 font-dm text-xs ${
                  selectedKey === t.key ? "bg-eoi-ink text-white" : "border border-eoi-border"
                }`}
              >
                {t.key}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
            />
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="HTML content"
              className="min-h-[180px] w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
            />
            <label className="flex items-center gap-2 font-dm text-sm text-eoi-ink2">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Enabled
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReviewOpen((v) => !v)}
                disabled={!selectedKey}
                className="rounded-full border border-eoi-border px-4 py-2 font-dm text-sm font-semibold text-eoi-ink disabled:opacity-50"
              >
                {reviewOpen ? "Hide review" : "Review template"}
              </button>
              <button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={saving || !selectedKey}
                className="rounded-full bg-eoi-ink px-4 py-2 font-dm text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save template"}
              </button>
            </div>
            {reviewOpen ? (
              <div className="mt-2 space-y-2 rounded-xl border border-eoi-border bg-eoi-surface/50 p-3">
                <p className="font-dm text-xs font-semibold uppercase text-eoi-ink2">Review data (JSON)</p>
                <textarea
                  value={reviewVarsRaw}
                  onChange={(e) => setReviewVarsRaw(e.target.value)}
                  className="min-h-[110px] w-full rounded-[10px] border border-eoi-border bg-white px-3 py-2 font-mono text-xs"
                />
                {!reviewVars ? (
                  <p className="font-dm text-xs text-red-600">Invalid JSON for review variables.</p>
                ) : (
                  <>
                    <div className="rounded-lg border border-eoi-border bg-white p-3">
                      <p className="font-dm text-xs uppercase text-eoi-ink2">Rendered subject</p>
                      <p className="mt-1 font-dm text-sm text-eoi-ink">{reviewedSubject}</p>
                    </div>
                    <div className="rounded-lg border border-eoi-border bg-white p-2">
                      <p className="px-1 pb-2 font-dm text-xs uppercase text-eoi-ink2">Rendered HTML</p>
                      <iframe
                        title="Template review"
                        srcDoc={reviewedHtml}
                        className="h-[260px] w-full rounded border border-eoi-border bg-white"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
            <p className="font-syne text-lg font-bold text-eoi-ink">Marketing send</p>
            <div className="mt-3 space-y-2">
              <input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Campaign name"
                className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
              />
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as "all_customers" | "paid_customers" | "custom")}
                className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
              >
                <option value="all_customers">All customers</option>
                <option value="paid_customers">Paid customers</option>
                <option value="custom">Custom list</option>
              </select>
              {audience === "custom" ? (
                <textarea
                  value={customRecipients}
                  onChange={(e) => setCustomRecipients(e.target.value)}
                  placeholder="one@email.com, two@email.com"
                  className="min-h-[80px] w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
                />
              ) : null}
              <button
                type="button"
                onClick={() => void sendCampaign()}
                disabled={sending || !selectedKey}
                className="rounded-full bg-eoi-pink px-4 py-2 font-dm text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send campaign"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
            <p className="font-syne text-lg font-bold text-eoi-ink">Recent campaigns</p>
            <div className="mt-3 space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="rounded-lg border border-eoi-border p-2 font-dm text-xs">
                  <p className="font-semibold text-eoi-ink">{c.name}</p>
                  <p className="text-eoi-ink2">
                    {c.status} · {c.sent_count}/{c.recipient_count} sent · {c.failed_count} failed
                  </p>
                  {c.last_error ? <p className="mt-1 text-red-600">{c.last_error}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <p className="font-syne text-lg font-bold text-eoi-ink">Email log</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left font-dm text-xs">
            <thead>
              <tr className="border-b border-eoi-border">
                <th className="py-2">Time</th>
                <th className="py-2">Email</th>
                <th className="py-2">Subject</th>
                <th className="py-2">Status</th>
                <th className="py-2">Event</th>
                <th className="py-2">Message ID</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-eoi-border/60">
                  <td className="py-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="py-2">{l.recipient_email}</td>
                  <td className="py-2">{l.subject}</td>
                  <td className="py-2">{l.status}</td>
                  <td className="py-2">{l.event_type}</td>
                  <td className="py-2">{l.provider_message_id ?? "—"}</td>
                  <td className="py-2 text-red-600">{l.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {message ? <p className="font-dm text-sm text-eoi-ink2">{message}</p> : null}
    </div>
  );
}
