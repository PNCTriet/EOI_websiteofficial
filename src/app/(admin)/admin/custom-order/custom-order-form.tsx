"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/components/locale-provider";
import { createCustomCheckoutLink } from "./actions";

type ProductOpt = { id: string; name: string; price: number | null };
type VariantOpt = { id: string; product_id: string; label: string; sort_order: number };

type Line = { productId: string; variantId: string; quantity: number };

type Props = {
  catalog: { products: ProductOpt[]; variants: VariantOpt[] };
  initialProductId?: string;
  initialVariantId?: string;
};

export function CustomOrderForm({ catalog, initialProductId, initialVariantId }: Props) {
  const t = useTranslations();
  const sp = useSearchParams();
  const prePid = initialProductId ?? sp.get("productId") ?? "";
  const preVid = initialVariantId ?? sp.get("variantId") ?? "";

  const [lines, setLines] = useState<Line[]>(() => [
    {
      productId: prePid,
      variantId: preVid,
      quantity: 1,
    },
  ]);
  const [hideFromList, setHideFromList] = useState(true);
  const [paymentMode, setPaymentMode] = useState<"bank_transfer" | "cod" | "pay_later">(
    "bank_transfer",
  );
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, VariantOpt[]>();
    for (const v of catalog.variants) {
      const arr = m.get(v.product_id) ?? [];
      arr.push(v);
      m.set(v.product_id, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.sort_order - b.sort_order);
    }
    return m;
  }, [catalog.variants]);

  const inputClass =
    "mt-1 w-full rounded-[10px] border border-eoi-border bg-white px-3 py-2.5 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30";

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((row, j) => (j === i ? { ...row, ...patch } : row)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", variantId: "", quantity: 1 }]);
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  function errFromMessage(m?: string): string {
    const map: Record<string, string> = {
      Forbidden: "admin.customOrder.errForbidden",
      address_incomplete: "admin.customOrder.errAddress",
      lines_invalid: "admin.customOrder.errLines",
    };
    const path = m ? map[m] : undefined;
    return path ? t(path) : t("admin.customOrder.errGeneric");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCheckoutUrl(null);
    setSubmitting(true);
    const fd = new FormData();
    fd.set("hide_from_list", hideFromList ? "true" : "false");
    fd.set("payment_mode", paymentMode);
    fd.set("recipient_name", recipientName);
    fd.set("phone", phone);
    fd.set("email", email);
    fd.set("street", street);
    fd.set("ward", ward);
    fd.set("district", district);
    fd.set("province", province);
    fd.set("note", note);
    const validLines = lines.filter((l) => l.productId && l.variantId && l.quantity >= 1);
    fd.set("lines_json", JSON.stringify(validLines));

    const res = await createCustomCheckoutLink(fd);
    setSubmitting(false);
    if (!res.ok) {
      setError(errFromMessage(res.message));
      return;
    }
    if (res.checkoutUrl) setCheckoutUrl(res.checkoutUrl);
  }

  async function copyLink() {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="font-syne text-xl font-bold text-eoi-ink">{t("admin.customOrder.title")}</h1>
        <p className="mt-1 font-dm text-sm text-eoi-ink2">{t("admin.customOrder.subtitle")}</p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-eoi-border bg-white p-3">
        <input
          type="checkbox"
          checked={hideFromList}
          onChange={(e) => setHideFromList(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-dm text-sm font-medium text-eoi-ink">{t("admin.customOrder.hideFromList")}</span>
          <span className="mt-0.5 block font-dm text-[11px] text-eoi-ink2">
            {t("admin.customOrder.hideFromListHint")}
          </span>
        </span>
      </label>

      <div className="rounded-xl border border-eoi-border bg-white p-3">
        <p className="font-dm text-sm font-semibold text-eoi-ink">{t("admin.customOrder.paymentMode")}</p>
        <p className="mt-0.5 font-dm text-[11px] text-eoi-ink2">{t("admin.customOrder.paymentModeHint")}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {(
            [
              ["bank_transfer", "admin.customOrder.paymentModeBank"],
              ["cod", "admin.customOrder.paymentModeCod"],
              ["pay_later", "admin.customOrder.paymentModePayLater"],
            ] as const
          ).map(([value, labelKey]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-dm text-sm ${
                paymentMode === value
                  ? "border-eoi-pink bg-eoi-pink-light/40 text-eoi-ink"
                  : "border-eoi-border text-eoi-ink2"
              }`}
            >
              <input
                type="radio"
                name="payment_mode_ui"
                checked={paymentMode === value}
                onChange={() => setPaymentMode(value)}
                className="accent-eoi-pink"
              />
              {t(labelKey)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <p className="font-dm text-sm font-semibold text-eoi-ink">{t("admin.customOrder.lines")}</p>
        {lines.map((line, i) => {
          const vOpts = line.productId ? variantsByProduct.get(line.productId) ?? [] : [];
          return (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-eoi-border/80 bg-eoi-pink-light/20 p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-5">
                <label className="font-dm text-[11px] text-eoi-ink2">{t("admin.customOrder.product")}</label>
                <select
                  value={line.productId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const firstV = variantsByProduct.get(pid)?.[0]?.id ?? "";
                    setLine(i, { productId: pid, variantId: firstV });
                  }}
                  className={inputClass}
                  required
                >
                  <option value="">—</option>
                  {catalog.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5">
                <label className="font-dm text-[11px] text-eoi-ink2">{t("admin.customOrder.variant")}</label>
                <select
                  value={line.variantId}
                  onChange={(e) => setLine(i, { variantId: e.target.value })}
                  className={inputClass}
                  required
                  disabled={!line.productId}
                >
                  <option value="">—</option>
                  {vOpts.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="font-dm text-[11px] text-eoi-ink2">{t("admin.customOrder.quantity")}</label>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-12">
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 1}
                  className="font-dm text-xs text-eoi-ink2 underline disabled:opacity-40"
                >
                  {t("admin.customOrder.removeLine")}
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addLine}
          className="rounded-full border border-eoi-border bg-eoi-pink-light px-4 py-2 font-dm text-xs font-medium text-eoi-pink-dark"
        >
          {t("admin.customOrder.addLine")}
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <p className="font-dm text-sm font-semibold text-eoi-ink">{t("admin.customOrder.shippingBlock")}</p>
        <div>
          <label className="font-dm text-xs text-eoi-ink2">{t("admin.orders.customerName")}</label>
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="font-dm text-xs text-eoi-ink2">{t("admin.orders.phone")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="font-dm text-xs text-eoi-ink2">{t("admin.orders.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-dm text-xs text-eoi-ink2">{t("admin.orders.shippingAddress")} — street</label>
          <input value={street} onChange={(e) => setStreet(e.target.value)} className={inputClass} required />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="font-dm text-xs text-eoi-ink2">Phường/Xã</label>
            <input value={ward} onChange={(e) => setWard(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="font-dm text-xs text-eoi-ink2">Quận/Huyện</label>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="font-dm text-xs text-eoi-ink2">Tỉnh/TP</label>
            <input
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label className="font-dm text-xs text-eoi-ink2">{t("admin.customOrder.note")}</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} min-h-[80px]`} />
      </div>

      {error ? (
        <p className="font-dm text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[44px] w-full rounded-full bg-eoi-ink px-5 py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? t("admin.customOrder.creating") : t("admin.customOrder.create")}
      </button>

      {checkoutUrl ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="font-dm text-sm font-semibold text-emerald-900">{t("admin.customOrder.successTitle")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input readOnly value={checkoutUrl} className={`${inputClass} flex-1 font-mono text-xs`} />
            <button
              type="button"
              onClick={() => void copyLink()}
              className="rounded-full border border-emerald-700 bg-white px-4 py-2 font-dm text-xs font-semibold text-emerald-900"
            >
              {copied ? t("admin.customOrder.copied") : t("admin.customOrder.copyLink")}
            </button>
          </div>
          <p className="mt-2 font-dm text-[11px] text-emerald-900/80">{t("admin.customOrder.afterPayNote")}</p>
        </div>
      ) : null}
    </form>
  );
}
