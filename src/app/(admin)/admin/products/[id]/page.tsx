"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductDescriptionEditor } from "@/components/admin/product-description-editor";
import { useTranslations } from "@/components/locale-provider";
import { createClient } from "@/lib/supabase/client";
import {
  defaultAvailability,
  type ProductAvailability,
  isProductAvailability,
} from "@/lib/product-availability";
import { isStoreCategorySlug } from "@/lib/product-taxonomy";
import type { ProductRow } from "@/types/database";

function normalizeBadgeForForm(b: string | null | undefined): string {
  if (!b?.trim()) return "";
  const u = b.trim();
  const lower = u.toLowerCase();
  if (lower === "hot") return "Hot";
  if (lower === "mới" || lower === "moi" || lower === "new") return "New";
  if (lower === "sale") return "Sale";
  return u;
}

function normalizeColorInput(s: string): string | null {
  let x = s.trim();
  if (!x) return null;
  if (!x.startsWith("#")) x = `#${x}`;
  if (/^#[0-9A-Fa-f]{6}$/i.test(x)) return x.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(x)) {
    const [, r, g, b] = x;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

export default function AdminProductFormPage() {
  const t = useTranslations();
  const params = useParams();
  const idParam = params.id as string;
  const isNew = idParam === "new";
  const router = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stlUrl, setStlUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  /** Bump after loading product so TipTap remounts with correct HTML */
  const [descriptionEditorEpoch, setDescriptionEditorEpoch] = useState(0);

  const [material, setMaterial] = useState("");
  /** Preset slug, "__custom__", or "" (unset) */
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryCustom, setCategoryCustom] = useState("");
  const [badge, setBadge] = useState("");
  const [colors, setColors] = useState<string[]>(["#F472B6"]);
  const [deliveryMin, setDeliveryMin] = useState("3");
  const [deliveryMax, setDeliveryMax] = useState("5");
  const [availability, setAvailability] =
    useState<ProductAvailability>(defaultAvailability());

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("products")
        .select("*")
        .eq("id", idParam)
        .single();
      if (cancelled) return;
      if (e || !data) {
        setError(t("admin.products.loadError"));
        setLoading(false);
        return;
      }
      const p = data as ProductRow;
      setName(p.name);
      setDescription(p.description ?? "");
      setPrice(p.price != null ? String(p.price) : "");
      setAvailability(
        isProductAvailability(p.availability)
          ? p.availability
          : defaultAvailability()
      );
      setStlUrl(p.stl_url ?? "");
      setIsActive(p.is_active);
      setImageUrls(p.image_urls ?? []);
      setMaterial(p.material ?? "");
      const cat = (p.category ?? "").trim();
      if (cat && isStoreCategorySlug(cat.toLowerCase())) {
        setCategorySelect(cat.toLowerCase());
        setCategoryCustom("");
      } else if (cat) {
        setCategorySelect("__custom__");
        setCategoryCustom(cat);
      } else {
        setCategorySelect("");
        setCategoryCustom("");
      }
      setBadge(normalizeBadgeForForm(p.badge));
      setColors(
        p.colors?.length ? [...p.colors] : ["#F472B6"]
      );
      setDeliveryMin(String(p.delivery_days_min ?? 3));
      setDeliveryMax(String(p.delivery_days_max ?? 5));
      setDescriptionEditorEpoch((x) => x + 1);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [idParam, isNew, t]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const next: string[] = [...imageUrls];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError(t("admin.products.invalidImageType"));
        setUploading(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(t("admin.products.imageTooLarge"));
        setUploading(false);
        return;
      }
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file);
      if (upErr) {
        setError(upErr.message);
        setUploading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);
      next.push(publicUrl);
    }
    setImageUrls(next);
    setUploading(false);
  }

  function validate(): boolean {
    const fe: Record<string, string> = {};
    if (!name.trim()) fe.name = t("admin.products.fieldRequired");

    const priceTrim = price.trim();
    if (availability === "coming_soon") {
      if (priceTrim !== "") {
        const p = Number(priceTrim);
        if (Number.isNaN(p) || p < 0) fe.price = t("admin.products.invalidPrice");
      }
    } else {
      if (priceTrim === "") {
        fe.price = t("admin.products.fieldRequired");
      } else {
        const p = Number(priceTrim);
        if (Number.isNaN(p) || p < 0) fe.price = t("admin.products.invalidPrice");
      }
    }

    if (!categorySelect) {
      fe.category = t("admin.products.fieldRequired");
    } else if (categorySelect === "__custom__" && !categoryCustom.trim()) {
      fe.category = t("admin.products.fieldRequired");
    }

    const dMin = Number.parseInt(deliveryMin, 10);
    const dMax = Number.parseInt(deliveryMax, 10);
    if (
      Number.isNaN(dMin) ||
      Number.isNaN(dMax) ||
      dMin < 0 ||
      dMax < 0 ||
      dMax < dMin
    ) {
      fe.delivery = t("admin.products.invalidDeliveryRange");
    }

    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    const supabase = createClient();

    const categoryResolved =
      categorySelect === "__custom__"
        ? categoryCustom.trim() || null
        : categorySelect || null;

    const normalizedColors = colors
      .map((c) => normalizeColorInput(c))
      .filter((c): c is string => c !== null);

    const dMin = Number.parseInt(deliveryMin, 10);
    const dMax = Number.parseInt(deliveryMax, 10);

    const priceTrim = price.trim();
    const pricePayload =
      availability === "coming_soon" && priceTrim === ""
        ? null
        : Number(priceTrim);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: pricePayload,
      availability,
      stl_url: stlUrl.trim() || null,
      is_active: isActive,
      image_urls: imageUrls.length ? imageUrls : null,
      category: categoryResolved,
      material: material.trim() || null,
      badge: badge.trim() || null,
      colors: normalizedColors.length ? normalizedColors : null,
      delivery_days_min: dMin,
      delivery_days_max: dMax,
    };

    if (isNew) {
      const { error: insErr } = await supabase.from("products").insert(payload);
      if (insErr) {
        setError(insErr.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { error: updErr } = await supabase
        .from("products")
        .update(payload)
        .eq("id", idParam);
      if (updErr) {
        setError(updErr.message);
        setSubmitting(false);
        return;
      }
    }
    router.push("/admin/products");
    router.refresh();
  }

  function setColorAt(index: number, value: string) {
    setColors((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function addColorRow() {
    setColors((prev) => [...prev, "#64748B"]);
  }

  function removeColorRow(index: number) {
    setColors((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  function removeImageAt(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="animate-pulse p-5 md:p-6">
        <div className="h-8 w-48 rounded bg-eoi-border" />
        <div className="mt-6 space-y-4">
          <div className="h-12 rounded-[10px] bg-eoi-border" />
          <div className="h-24 rounded-[10px] bg-eoi-border" />
          <div className="h-12 rounded-[10px] bg-eoi-border" />
        </div>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-[10px] border border-eoi-border bg-white px-3 py-3 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30";

  return (
    <div className="p-5 md:p-6">
      <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
        {isNew ? t("admin.products.formTitleNew") : t("admin.products.formTitleEdit")}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-6 max-w-xl space-y-5 rounded-2xl border border-eoi-border bg-white p-5 shadow-sm"
      >
        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.productNameField")}
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          {fieldErrors.name ? (
            <p className="mt-1 font-dm text-xs text-red-600">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.description")}
          </label>
          <p className="mt-0.5 font-dm text-[11px] text-eoi-ink2">
            {t("admin.products.descriptionEditorHint")}
          </p>
          <div className="mt-2">
            <ProductDescriptionEditor
              key={`${idParam}-${descriptionEditorEpoch}`}
              initialContent={description}
              onChange={setDescription}
              placeholder={t("admin.products.description")}
            />
          </div>
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.availability")}
          </label>
          <select
            value={availability}
            onChange={(e) =>
              setAvailability(e.target.value as ProductAvailability)
            }
            className={inputClass}
          >
            <option value="in_stock">{t("admin.products.availabilityInStock")}</option>
            <option value="coming_soon">
              {t("admin.products.availabilityComingSoon")}
            </option>
            <option value="out_of_stock">
              {t("admin.products.availabilityOutOfStock")}
            </option>
          </select>
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.priceDong")}
            {availability === "coming_soon" ? (
              <span className="ml-1 font-normal text-eoi-ink2">
                ({t("common.optional")})
              </span>
            ) : null}
          </label>
          <p className="mt-0.5 font-dm text-[11px] text-eoi-ink2">
            {availability === "coming_soon"
              ? t("admin.products.priceOptionalHint")
              : null}
          </p>
          <div className="relative mt-1">
            <input
              type="number"
              min={0}
              step={1000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${inputClass} pr-10`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-dm text-xs text-eoi-ink2">
              đ
            </span>
          </div>
          {fieldErrors.price ? (
            <p className="mt-1 font-dm text-xs text-red-600">{fieldErrors.price}</p>
          ) : null}
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.categoryPreset")}
          </label>
          <select
            value={categorySelect}
            onChange={(e) => setCategorySelect(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("admin.products.categorySelectPlaceholder")}</option>
            <option value="decor">{t("store.categories.decor")}</option>
            <option value="scene">{t("store.categories.scene")}</option>
            <option value="office">{t("store.categories.office")}</option>
            <option value="gift">{t("store.categories.gift")}</option>
            <option value="__custom__">{t("admin.products.categoryCustom")}</option>
          </select>
          {categorySelect === "__custom__" ? (
            <input
              value={categoryCustom}
              onChange={(e) => setCategoryCustom(e.target.value)}
              placeholder={t("admin.products.categoryCustomPlaceholder")}
              className={`${inputClass} mt-2`}
            />
          ) : null}
          {fieldErrors.category ? (
            <p className="mt-1 font-dm text-xs text-red-600">{fieldErrors.category}</p>
          ) : null}
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.materialField")}
          </label>
          <input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.badge")}
          </label>
          <select
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("admin.products.badgeNone")}</option>
            <option value="Hot">{t("badges.hot")}</option>
            <option value="New">{t("badges.new")}</option>
            <option value="Sale">{t("badges.sale")}</option>
          </select>
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.colorsLabel")}
          </label>
          <div className="mt-2 space-y-2">
            {colors.map((hex, i) => {
              const pickerSafe = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex : "#000000";
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={pickerSafe}
                    onChange={(e) => setColorAt(i, e.target.value.toUpperCase())}
                    className="h-10 w-14 cursor-pointer rounded border border-eoi-border bg-white"
                    aria-label={`${t("admin.products.colorsLabel")} ${i + 1}`}
                  />
                  <input
                    value={hex}
                    onChange={(e) => setColorAt(i, e.target.value)}
                    placeholder="#RRGGBB"
                    className={`${inputClass} mt-0 min-w-[7rem] flex-1 font-mono text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => removeColorRow(i)}
                    disabled={colors.length <= 1}
                    className="rounded-full border border-eoi-border px-3 py-2 font-dm text-xs text-eoi-ink disabled:opacity-40"
                  >
                    {t("admin.products.colorsRemove")}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addColorRow}
            className="mt-2 rounded-full border border-eoi-border bg-eoi-pink-light px-4 py-2 font-dm text-xs font-medium text-eoi-pink-dark"
          >
            {t("admin.products.colorsAdd")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-dm text-xs font-medium text-eoi-ink2">
              {t("admin.products.deliveryDaysMin")}
            </label>
            <input
              type="number"
              min={0}
              value={deliveryMin}
              onChange={(e) => setDeliveryMin(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="font-dm text-xs font-medium text-eoi-ink2">
              {t("admin.products.deliveryDaysMax")}
            </label>
            <input
              type="number"
              min={0}
              value={deliveryMax}
              onChange={(e) => setDeliveryMax(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <p className="font-dm text-[11px] text-eoi-ink2">
          {t("admin.products.deliveryDaysHint")}
        </p>
        {fieldErrors.delivery ? (
          <p className="font-dm text-xs text-red-600">{fieldErrors.delivery}</p>
        ) : null}

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.uploadImages")}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => void handleFiles(e.target.files)}
            className="mt-1 w-full font-dm text-sm text-eoi-ink2 file:mr-3 file:rounded-full file:border-0 file:bg-eoi-pink-light file:px-4 file:py-2 file:font-dm file:text-sm file:font-medium file:text-eoi-pink-dark"
          />
          {uploading ? (
            <p className="mt-1 font-dm text-xs text-eoi-ink2">
              {t("admin.products.uploading")}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded-lg border border-eoi-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImageAt(i)}
                  className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-red-600 shadow ring-1 ring-eoi-border"
                  aria-label={`${t("admin.products.colorsRemove")} image ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.stlUrl")} ({t("admin.products.stlOptional")})
          </label>
          <input
            type="url"
            value={stlUrl}
            onChange={(e) => setStlUrl(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((a) => !a)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              isActive ? "bg-eoi-pink" : "bg-eoi-border"
            }`}
          >
            <span
              className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                isActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="font-dm text-sm text-eoi-ink">
            {isActive ? t("admin.products.visible") : t("admin.products.hidden")}
          </span>
        </div>

        {error ? (
          <p className="font-dm text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] flex-1 rounded-full bg-eoi-ink px-5 py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t("admin.products.saving") : t("common.save")}
          </button>
          <Link
            href="/admin/products"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-eoi-border bg-white px-5 py-3 font-dm text-sm font-medium text-eoi-ink"
          >
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
