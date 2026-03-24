"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { useLocaleContext, useTranslations } from "@/components/locale-provider";
import { formatPrice } from "@/lib/format-locale";
import { createCheckoutOrder } from "@/app/(store)/checkout/actions";

type Props = {
  userInfo: {
    email: string;
    fullName: string;
  };
  initialAddress: {
    recipient_name?: string;
    phone?: string;
    street?: string;
    ward?: string;
    district?: string;
    province?: string;
  };
};

type Suggestion = {
  full: string;
  street: string;
  ward: string;
  district: string;
  province: string;
};

export function CheckoutPageClient({ initialAddress, userInfo }: Props) {
  const t = useTranslations();
  const { locale } = useLocaleContext();
  const { items, subtotal } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [street, setStreet] = useState(initialAddress.street ?? "");
  const [ward, setWard] = useState(initialAddress.ward ?? "");
  const [district, setDistrict] = useState(initialAddress.district ?? "");
  const [province, setProvince] = useState(initialAddress.province ?? "");
  const [streetSug, setStreetSug] = useState<Suggestion[]>([]);
  const [districtSug, setDistrictSug] = useState<Suggestion[]>([]);
  const [provinceSug, setProvinceSug] = useState<Suggestion[]>([]);

  const cartItemsJson = useMemo(
    () =>
      JSON.stringify(
        items.map((x) => ({
          productId: x.productId,
          quantity: x.quantity,
        }))
      ),
    [items]
  );

  return (
    <div className="space-y-5">
      <h1 className="font-syne text-2xl font-bold text-eoi-ink">{t("store.checkout")}</h1>

      <form
        className="space-y-4 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          startTransition(() => {
            void createCheckoutOrder(fd).then((res) => {
              if (!res.ok || !res.orderId) {
                setError(res.message ?? t("common.error"));
                return;
              }
              router.push(`/checkout/pending/${res.orderId}`);
            });
          });
        }}
      >
        <input type="hidden" name="cart_items_json" value={cartItemsJson} />
        <input type="hidden" name="email" value={userInfo.email} />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="email_display"
            value={userInfo.email}
            readOnly
            placeholder="Email"
            className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm md:col-span-2"
          />
          <input
            name="recipient_name"
            required
            defaultValue={initialAddress.recipient_name ?? userInfo.fullName}
            placeholder="Recipient name"
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="phone"
            required
            defaultValue={initialAddress.phone ?? ""}
            placeholder="Phone"
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="street"
            required
            value={street}
            onChange={(e) => {
              const v = e.target.value;
              setStreet(v);
              if (v.trim().length < 2) {
                setStreetSug([]);
                return;
              }
              void fetch(`/api/address/suggest?type=street&q=${encodeURIComponent(v)}`)
                .then((r) => r.json())
                .then((d: { suggestions?: Suggestion[] }) => setStreetSug(d.suggestions ?? []));
            }}
            placeholder="Street"
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm md:col-span-2"
          />
          {streetSug.length > 0 ? (
            <div className="md:col-span-2 -mt-2 rounded-xl border border-eoi-border bg-white p-2">
              {streetSug.map((s) => (
                <button
                  key={s.full}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left font-dm text-xs text-eoi-ink hover:bg-eoi-surface"
                  onClick={() => {
                    setStreet(s.street || street);
                    setWard(s.ward || ward);
                    setDistrict(s.district || district);
                    setProvince(s.province || province);
                    setStreetSug([]);
                  }}
                >
                  {s.full}
                </button>
              ))}
            </div>
          ) : null}
          <input
            name="ward"
            required
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            placeholder="Ward"
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="district"
            required
            value={district}
            onChange={(e) => {
              const v = e.target.value;
              setDistrict(v);
              if (v.trim().length < 2) {
                setDistrictSug([]);
                return;
              }
              void fetch(`/api/address/suggest?type=district&q=${encodeURIComponent(v)}`)
                .then((r) => r.json())
                .then((d: { suggestions?: Suggestion[] }) => setDistrictSug(d.suggestions ?? []));
            }}
            placeholder="District"
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          {districtSug.length > 0 ? (
            <div className="md:col-span-2 -mt-2 rounded-xl border border-eoi-border bg-white p-2">
              {districtSug.map((s) => (
                <button
                  key={s.full}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left font-dm text-xs text-eoi-ink hover:bg-eoi-surface"
                  onClick={() => {
                    setDistrict(s.district || district);
                    setProvince(s.province || province);
                    setDistrictSug([]);
                  }}
                >
                  {s.full}
                </button>
              ))}
            </div>
          ) : null}
          <input
            name="province"
            required
            value={province}
            onChange={(e) => {
              const v = e.target.value;
              setProvince(v);
              if (v.trim().length < 2) {
                setProvinceSug([]);
                return;
              }
              void fetch(`/api/address/suggest?type=city&q=${encodeURIComponent(v)}`)
                .then((r) => r.json())
                .then((d: { suggestions?: Suggestion[] }) => setProvinceSug(d.suggestions ?? []));
            }}
            placeholder="Province"
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm md:col-span-2"
          />
          {provinceSug.length > 0 ? (
            <div className="md:col-span-2 -mt-2 rounded-xl border border-eoi-border bg-white p-2">
              {provinceSug.map((s) => (
                <button
                  key={s.full}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left font-dm text-xs text-eoi-ink hover:bg-eoi-surface"
                  onClick={() => {
                    setProvince(s.province || province);
                    setProvinceSug([]);
                  }}
                >
                  {s.full}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            name="note"
            placeholder="Note (optional)"
            className="min-h-[90px] rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm md:col-span-2"
          />
        </div>
        <label className="flex items-center gap-2 font-dm text-sm text-eoi-ink2">
          <input
            type="checkbox"
            name="save_address"
            value="true"
            checked={saveAddress}
            onChange={(e) => setSaveAddress(e.target.checked)}
          />
          Save as default address
        </label>
        {error ? <p className="font-dm text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || items.length === 0}
          className="min-h-[44px] w-full rounded-full bg-eoi-ink px-4 py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("admin.products.saving") : "Create order"}
        </button>
      </form>

      <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <p className="font-dm text-sm text-eoi-ink2">{t("store.subtotal")}</p>
        <p className="font-syne text-xl font-extrabold text-eoi-ink">
          {formatPrice(locale, subtotal)}
        </p>
      </div>
    </div>
  );
}
