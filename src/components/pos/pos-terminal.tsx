"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "@/components/locale-provider";

type Product = {
  id: string;
  name: string;
  price: number | null;
  image_thumb_urls?: string[] | null;
  image_urls?: string[] | null;
};
type CartLine = { product: Product; quantity: number };
type CreatedOrder = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: string;
  payment_method: string;
  expires_at: string | null;
};
type PosMode = "offline" | "online";

function money(v: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);
}

export function PosTerminal() {
  const t = useTranslations();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr">("cash");
  const [mode, setMode] = useState<PosMode>("offline");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [showQrPopup, setShowQrPopup] = useState(false);
  const [qrPaid, setQrPaid] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/pos/products");
      const json = (await res.json()) as { products?: Product[] };
      setProducts(json.products ?? []);
    })();
  }, []);

  const total = useMemo(
    () =>
      cart.reduce((sum, line) => sum + (Number(line.product.price ?? 0) || 0) * line.quantity, 0),
    [cart]
  );
  const totalQty = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const qtyByProductId = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of cart) m.set(line.product.id, line.quantity);
    return m;
  }, [cart]);

  function addProduct(product: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.product.id === product.id);
      if (idx < 0) return [...prev, { product, quantity: 1 }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  }

  function decreaseProduct(productId: string) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.product.id === productId
            ? { ...line, quantity: Math.max(0, line.quantity - 1) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  async function checkout() {
    if (cart.length === 0) return;
    if (!recipientName.trim()) {
      setError(t("admin.pos.errorNameRequired"));
      return;
    }
    if (mode === "online") {
      if (!email.trim() || !phone.trim() || !street.trim() || !ward.trim() || !district.trim() || !province.trim()) {
        setError(t("admin.pos.errorOnlineRequired"));
        return;
      }
    }
    setLoading(true);
    setError(null);
    setCreatedRef(null);
    setCreatedOrder(null);
    try {
      const items = cart.map((line) => ({
        product_id: line.product.id,
        quantity: line.quantity,
        unit_price: Number(line.product.price ?? 0),
        product_name_snapshot: line.product.name,
      }));
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          mode,
          payment_method: paymentMethod,
          recipient_name: recipientName,
          email,
          phone,
          street,
          ward,
          district,
          province,
          note,
        }),
      });
      const json = (await res.json()) as { order?: CreatedOrder; error?: string };
      if (!res.ok) throw new Error(json.error ?? t("admin.pos.errorCheckout"));
      setCreatedRef(json.order?.sepay_ref ?? null);
      setCreatedOrder(json.order ?? null);
      setQrPaid(false);
      if (json.order?.payment_method === "bank_transfer") {
        setShowQrPopup(true);
      }
      setCart([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.pos.errorCheckout"));
    } finally {
      setLoading(false);
    }
  }

  const bankCode = process.env.NEXT_PUBLIC_PAYMENT_BANK_CODE ?? "970432";
  const accountNo = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NO ?? "214244527";
  const accountName = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME ?? "EOI";
  const qrAmount = createdOrder?.total_amount ?? total;
  const qrRef = createdOrder?.sepay_ref ?? createdRef ?? "";
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(
    qrRef
  )}&accountName=${encodeURIComponent(accountName)}`;
  const expiresAtMs = createdOrder?.expires_at ? new Date(createdOrder.expires_at).getTime() : null;
  const msLeft = expiresAtMs ? Math.max(0, expiresAtMs - now) : 0;
  const mm = String(Math.floor(msLeft / 60000)).padStart(2, "0");
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0");

  useEffect(() => {
    if (!showQrPopup || !createdOrder || createdOrder.payment_method !== "bank_transfer") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [showQrPopup, createdOrder]);

  useEffect(() => {
    if (!showQrPopup || !createdOrder || createdOrder.payment_method !== "bank_transfer") return;
    const timer = window.setInterval(() => {
      void fetch(`/api/orders/${createdOrder.id}/status`)
        .then((r) => r.json())
        .then((d: { stage?: string }) => {
          if (d.stage && d.stage !== "pending_payment") {
            setQrPaid(true);
          }
        })
        .catch(() => {
          /* ignore */
        });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [showQrPopup, createdOrder]);

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-syne text-2xl font-bold text-eoi-ink">{t("admin.pos.panelTitle")}</h1>
          <p className="mt-1 font-dm text-sm text-eoi-ink2">{t("admin.pos.panelHint")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="mt-3 inline-flex rounded-full border border-eoi-border bg-eoi-surface p-0.5">
        <button
          type="button"
          onClick={() => setMode("offline")}
          className={`min-h-[36px] rounded-full px-3 font-dm text-xs font-semibold ${
            mode === "offline" ? "bg-eoi-ink text-white" : "text-eoi-ink2"
          }`}
        >
          {t("admin.pos.modeOffline")}
        </button>
        <button
          type="button"
          onClick={() => setMode("online")}
          className={`min-h-[36px] rounded-full px-3 font-dm text-xs font-semibold ${
            mode === "online" ? "bg-eoi-ink text-white" : "text-eoi-ink2"
          }`}
        >
          {t("admin.pos.modeOnline")}
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-2xl border border-eoi-border bg-eoi-surface p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-syne text-lg font-bold text-eoi-ink">{t("admin.pos.products")}</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.pos.searchPlaceholder")}
              className="w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink sm:w-[260px]"
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((p) => {
              const thumb = p.image_thumb_urls?.[0] ?? p.image_urls?.[0] ?? null;
              const qty = qtyByProductId.get(p.id) ?? 0;
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-eoi-border bg-eoi-surface"
                >
                  <button
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full text-left"
                  >
                    <div className="relative h-28 w-full bg-eoi-bg">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-dm text-xs text-eoi-ink2">
                          {t("admin.pos.noImage")}
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <p className="line-clamp-2 font-dm text-sm font-medium text-eoi-ink">{p.name}</p>
                      <p className="mt-1 font-syne text-base font-bold text-eoi-ink">
                        {money(Number(p.price ?? 0))}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center justify-between border-t border-eoi-border px-2 py-1.5">
                    <span className="font-dm text-xs text-eoi-ink2">
                      {t("admin.pos.inCartQty", { qty: String(qty) })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => decreaseProduct(p.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eoi-border bg-eoi-surface font-dm text-sm text-eoi-ink"
                        aria-label={t("admin.pos.decrease")}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => addProduct(p)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eoi-border bg-eoi-ink font-dm text-sm text-white"
                        aria-label={t("admin.pos.increase")}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 ? (
              <p className="col-span-full font-dm text-sm text-eoi-ink2">{t("admin.pos.noProducts")}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-eoi-border bg-eoi-surface p-4">
          <h2 className="font-syne text-lg font-bold text-eoi-ink">{t("admin.pos.cart")}</h2>
          <p className="mt-0.5 font-dm text-xs text-eoi-ink2">
            {t("admin.pos.cartCount", { qty: String(totalQty) })}
          </p>
          <div className="mt-3 space-y-2">
            {cart.map((line) => (
              <div key={line.product.id} className="rounded-lg border border-eoi-border bg-eoi-surface px-3 py-2">
                <p className="font-dm text-sm text-eoi-ink">{line.product.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-dm text-xs text-eoi-ink2">
                    {money(Number(line.product.price ?? 0))}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => decreaseProduct(line.product.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eoi-border bg-eoi-surface font-dm text-sm text-eoi-ink"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-dm text-sm text-eoi-ink">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => addProduct(line.product)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eoi-border bg-eoi-ink font-dm text-sm text-white"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(line.product.id)}
                      className="ml-1 inline-flex h-7 items-center justify-center rounded-full border border-red-200 px-2 font-dm text-xs text-red-700"
                    >
                      {t("admin.pos.remove")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 ? <p className="font-dm text-sm text-eoi-ink2">{t("admin.pos.emptyCart")}</p> : null}
          </div>

          <div className="mt-4 rounded-xl border border-eoi-border bg-eoi-surface p-3">
            <label className="font-dm text-xs text-eoi-ink2">{t("admin.pos.customerName")}</label>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t("admin.pos.customerNamePlaceholder")}
              className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
            />
            {mode === "online" ? (
              <>
                <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("admin.pos.customerEmail")}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("admin.pos.customerEmailPlaceholder")}
                  className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
                />
              </>
            ) : null}
            <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("admin.pos.customerPhone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("admin.pos.customerPhonePlaceholder")}
              className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
            />
            {mode === "online" ? (
              <>
                <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("store.checkoutStreetPlaceholder")}</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={t("store.checkoutStreetPlaceholder")}
                  className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
                />
                <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("store.checkoutWardPlaceholder")}</label>
                <input
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder={t("store.checkoutWardPlaceholder")}
                  className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
                />
                <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("store.checkoutDistrictPlaceholder")}</label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder={t("store.checkoutDistrictPlaceholder")}
                  className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
                />
                <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("store.checkoutProvincePlaceholder")}</label>
                <input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder={t("store.checkoutProvincePlaceholder")}
                  className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
                />
              </>
            ) : null}
            <label className="mt-2 block font-dm text-xs text-eoi-ink2">{t("admin.pos.orderNote")}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("admin.pos.orderNotePlaceholder")}
              className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
            />
          </div>

          <div className="mt-4 rounded-xl border border-eoi-border bg-eoi-surface p-3">
            <label className="font-dm text-xs text-eoi-ink2">{t("admin.pos.paymentMethod")}</label>
            {mode === "online" ? (
              <p className="mt-1 rounded-[10px] border border-eoi-border bg-eoi-bg px-3 py-2 font-dm text-sm text-eoi-ink">
                {t("admin.pos.paymentQr")}
              </p>
            ) : (
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "cash" | "qr")}
                className="mt-1 w-full rounded-[10px] border border-eoi-border bg-eoi-surface px-3 py-2 font-dm text-sm text-eoi-ink"
              >
                <option value="cash">{t("admin.pos.paymentCash")}</option>
                <option value="qr">{t("admin.pos.paymentQr")}</option>
              </select>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="font-dm text-sm text-eoi-ink2">{t("admin.pos.total")}</span>
            <span className="font-syne text-xl font-extrabold text-eoi-ink">{money(total)}</span>
          </div>

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={loading || cart.length === 0}
            className="mt-3 min-h-[44px] w-full rounded-full bg-eoi-ink px-4 py-2 font-dm text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? t("admin.pos.processing") : t("admin.pos.createOrder")}
          </button>
          <button
            type="button"
            onClick={clearCart}
            disabled={loading || cart.length === 0}
            className="mt-2 min-h-[40px] w-full rounded-full border border-eoi-border bg-eoi-surface px-4 py-2 font-dm text-sm font-medium text-eoi-ink disabled:opacity-50"
          >
            {t("admin.pos.clearCart")}
          </button>
          {createdRef ? <p className="mt-2 font-dm text-xs text-emerald-700">{t("admin.pos.createdRef", { ref: createdRef })}</p> : null}
          {error ? <p className="mt-2 font-dm text-xs text-red-600">{error}</p> : null}

          {createdOrder && createdOrder.payment_method === "bank_transfer" ? (
            <p className="mt-2 font-dm text-xs text-amber-800">{t("admin.pos.qrPopupOpened")}</p>
          ) : null}
        </section>
      </div>

      {showQrPopup && createdOrder && createdOrder.payment_method === "bank_transfer" ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 px-4"
          onClick={() => setShowQrPopup(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-eoi-border bg-eoi-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-syne text-xl font-bold text-eoi-ink">{t("admin.pos.qrTitle")}</h3>
            <p className="mt-1 font-dm text-xs text-eoi-ink2">{t("admin.pos.qrHint")}</p>
            <p className="mt-2 font-dm text-xs text-eoi-ink2">
              {t("admin.pos.createdRef", { ref: createdOrder.sepay_ref ?? createdOrder.id })}
            </p>

            <div className="mx-auto mt-3 w-full max-w-[240px] overflow-hidden rounded-xl border border-eoi-border bg-white p-2">
              <Image src={qrUrl} alt="QR payment" width={240} height={240} className="h-auto w-full" />
            </div>
            <p className="mt-3 text-center font-dm text-sm font-semibold text-eoi-ink">
              {t("admin.pos.countdown")}: {mm}:{ss}
            </p>
            <p className="mt-1 font-dm text-xs text-eoi-ink2">
              {t("admin.pos.bankAccount")}: <span className="font-semibold text-eoi-ink">{accountNo}</span>
            </p>
            <p className="mt-1 font-dm text-xs text-eoi-ink2">
              {t("admin.pos.transferContent")}: <span className="font-semibold text-eoi-ink">{qrRef}</span>
            </p>

            {qrPaid ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-dm text-sm text-emerald-800">
                {t("admin.pos.paymentSuccess")}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowQrPopup(false)}
                className="min-h-[40px] flex-1 rounded-full border border-eoi-border bg-eoi-surface px-4 py-2 font-dm text-sm text-eoi-ink"
              >
                {t("admin.pos.closePopup")}
              </button>
              {qrPaid ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowQrPopup(false);
                    setCreatedOrder(null);
                  }}
                  className="min-h-[40px] flex-1 rounded-full bg-eoi-ink px-4 py-2 font-dm text-sm font-semibold text-white"
                >
                  {t("admin.pos.done")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
