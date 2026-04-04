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

  const cartItemsJson = useMemo(
    () =>
      JSON.stringify(
        items.map((x) => ({
          productId: x.productId,
          variantId: x.variantId,
          variantLabel: x.variantLabel,
          variantImageUrl: x.imageUrl,
          quantity: x.quantity,
          price: x.price,
          name: x.name,
        })),
      ),
    [items],
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
              if (!res.ok || !res.intentId) {
                setError(res.message ?? t("common.error"));
                return;
              }
              router.push(`/checkout/pending/${res.intentId}`);
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
            placeholder={t("store.checkoutEmailPlaceholder")}
            className="rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm md:col-span-2"
          />
          <input
            name="recipient_name"
            required
            defaultValue={initialAddress.recipient_name ?? userInfo.fullName}
            placeholder={t("store.checkoutRecipientNamePlaceholder")}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="phone"
            required
            defaultValue={initialAddress.phone ?? ""}
            placeholder={t("store.checkoutPhonePlaceholder")}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="street"
            required
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={t("store.checkoutStreetPlaceholder")}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm md:col-span-2"
          />
          <input
            name="ward"
            required
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            placeholder={t("store.checkoutWardPlaceholder")}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="district"
            required
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={t("store.checkoutDistrictPlaceholder")}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
          <input
            name="province"
            required
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder={t("store.checkoutProvincePlaceholder")}
            className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm md:col-span-2"
          />
          <textarea
            name="note"
            placeholder={t("store.checkoutNoteOptionalPlaceholder")}
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
          {t("store.checkoutSaveAddressLabel")}
        </label>
        {error ? <p className="font-dm text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || items.length === 0}
          className="min-h-[44px] w-full rounded-full bg-eoi-ink px-4 py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("admin.products.saving") : t("store.checkoutCreateOrder")}
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
