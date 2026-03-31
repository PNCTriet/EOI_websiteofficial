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
import type { ProductRow, ProductVariantRow } from "@/types/database";

type VariantFormRow = {
  id: string;
  label: string;
  color_hex: string;
  image_urls: string[];
  image_thumb_urls: string[];
};

function toVariantFormRow(r: ProductVariantRow): VariantFormRow {
  return {
    id: r.id,
    label: r.label,
    color_hex: r.color_hex ?? "#F472B6",
    image_urls: [...(r.image_urls ?? [])],
    image_thumb_urls: [...(r.image_thumb_urls ?? [])],
  };
}

function normalizeBadgeForForm(b: string | null | undefined): string {
  if (!b?.trim()) return "";
  return b
    .split(/[,\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((u) => {
      const lower = u.toLowerCase();
      if (lower === "hot") return "Hot";
      if (lower === "mới" || lower === "moi" || lower === "new") return "New";
      if (lower === "sale") return "Sale";
      return u;
    })
    .join(", ");
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

/** iOS/ảnh đôi khi không có đuôi trong file.name → Storage URL không có .jpg/.png, Next/Image & CDN dễ lỗi. */
function extFromImageMime(mime: string): string {
  const m: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
  };
  return m[mime.toLowerCase()] ?? "jpg";
}

function ensureFilenameHasImageExtension(name: string, mime: string): string {
  const n = name.trim();
  if (/\.[a-z0-9]{2,8}$/i.test(n)) return n;
  return `${n}.${extFromImageMime(mime)}`;
}

/** Supabase Storage key cannot include some special chars (e.g. []()). */
function sanitizeStorageFilename(name: string): string {
  const trimmed = name.trim();
  const i = trimmed.lastIndexOf(".");
  const base = i > 0 ? trimmed.slice(0, i) : trimmed;
  const ext = i > 0 ? trimmed.slice(i + 1) : "";

  const safeBase = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  const safeExt = ext.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  const finalBase = safeBase || "image";
  return safeExt ? `${finalBase}.${safeExt}` : finalBase;
}

function storageObjectStem(path: string): string {
  const i = path.lastIndexOf(".");
  return i > 0 ? path.slice(0, i) : path;
}

function mapStorageUploadError(message: string, t: (path: string) => string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("permission") || m.includes("unauthorized")) {
    return t("admin.products.uploadErrorPermission");
  }
  if (m.includes("invalid key")) {
    return t("admin.products.uploadErrorInvalidKey");
  }
  if (m.includes("network") || m.includes("fetch failed") || m.includes("timeout")) {
    return t("admin.products.uploadErrorNetwork");
  }
  return `${t("admin.products.uploadErrorGeneric")} (${message})`;
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
  const [imageThumbUrls, setImageThumbUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  /** Bump after loading product so TipTap remounts with correct HTML */
  const [descriptionEditorEpoch, setDescriptionEditorEpoch] = useState(0);

  const [material, setMaterial] = useState("");
  /** Preset slug, "__custom__", or "" (unset) */
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryCustom, setCategoryCustom] = useState("");
  const [badge, setBadge] = useState("");
  const [variants, setVariants] = useState<VariantFormRow[]>(() => [
    {
      id: crypto.randomUUID(),
      label: "Mặc định",
      color_hex: "#F472B6",
      image_urls: [],
      image_thumb_urls: [],
    },
  ]);
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
      setImageThumbUrls(p.image_thumb_urls ?? []);
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
      const { data: vrows } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", idParam)
        .order("sort_order", { ascending: true });
      if (vrows?.length) {
        setVariants(vrows.map((row) => toVariantFormRow(row as ProductVariantRow)));
      } else {
        setVariants([
          {
            id: crypto.randomUUID(),
            label: "Mặc định",
            color_hex: p.colors?.[0] ?? "#F472B6",
            image_urls: [],
            image_thumb_urls: [],
          },
        ]);
      }
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
    const nextThumbs: string[] = [...imageThumbUrls];

    async function makeThumbnailBlob(file: File): Promise<Blob | null> {
      if (!file.type.startsWith("image/")) return null;
      try {
        const bitmap = await createImageBitmap(file);
        const maxDim = 640;
        const w = bitmap.width;
        const h = bitmap.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, tw, th);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b),
            "image/jpeg",
            0.82
          );
        });
        return blob;
      } catch {
        return null;
      }
    }
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
      const safeName = sanitizeStorageFilename(
        ensureFilenameHasImageExtension(file.name.replace(/\s+/g, "-"), file.type)
      );
      const path = `${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file);
      if (upErr) {
        const userMsg = mapStorageUploadError(upErr.message, t);
        console.warn("[admin.products.upload] original upload failed", {
          code: (upErr as { name?: string }).name,
          message: upErr.message,
          path,
          fileType: file.type,
          fileSize: file.size,
        });
        setError(userMsg);
        setUploading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);
      next.push(publicUrl);

      const thumbBlob = await makeThumbnailBlob(file);
      if (thumbBlob) {
        const thumbPath = `thumb-${storageObjectStem(path)}.jpg`;
        const { error: upThumbErr } = await supabase.storage
          .from("product-images")
          .upload(thumbPath, thumbBlob, { contentType: "image/jpeg" });
        if (!upThumbErr) {
          const {
            data: { publicUrl: thumbPublicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(thumbPath);
          nextThumbs.push(thumbPublicUrl);
        } else {
          console.warn("[admin.products.upload] thumbnail upload failed", {
            message: upThumbErr.message,
            thumbPath,
          });
          // Fallback to original if thumbnail upload fails.
          nextThumbs.push(publicUrl);
        }
      } else {
        nextThumbs.push(publicUrl);
      }
    }
    setImageUrls(next);
    setImageThumbUrls(nextThumbs);
    setUploading(false);
  }

  async function persistVariants(supabase: ReturnType<typeof createClient>, productId: string) {
    const { data: existing } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);
    const keepIds = new Set(variants.map((v) => v.id));
    const toDelete =
      existing?.filter((e) => !keepIds.has(e.id)).map((e) => e.id) ?? [];
    if (toDelete.length) {
      await supabase.from("product_variants").delete().in("id", toDelete);
    }
    const rows = variants.map((v, i) => ({
      id: v.id,
      product_id: productId,
      label: v.label.trim() || `Mã ${i + 1}`,
      sort_order: i,
      color_hex: normalizeColorInput(v.color_hex),
      image_urls: v.image_urls.length ? v.image_urls : [],
      image_thumb_urls: v.image_thumb_urls.length ? v.image_thumb_urls : [],
    }));
    const { error } = await supabase.from("product_variants").upsert(rows, {
      onConflict: "id",
    });
    return error;
  }

  async function handleVariantFiles(variantIndex: number, files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const v = variants[variantIndex];
    if (!v) {
      setUploading(false);
      return;
    }
    const nextUrls = [...v.image_urls];
    const nextThumbs = [...v.image_thumb_urls];

    async function makeThumbnailBlob(file: File): Promise<Blob | null> {
      if (!file.type.startsWith("image/")) return null;
      try {
        const bitmap = await createImageBitmap(file);
        const maxDim = 640;
        const w = bitmap.width;
        const h = bitmap.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, tw, th);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82);
        });
        return blob;
      } catch {
        return null;
      }
    }

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
      const safeName = sanitizeStorageFilename(
        ensureFilenameHasImageExtension(file.name.replace(/\s+/g, "-"), file.type),
      );
      const path = `v-${v.id.slice(0, 8)}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
      if (upErr) {
        setError(mapStorageUploadError(upErr.message, t));
        setUploading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);
      nextUrls.push(publicUrl);
      const thumbBlob = await makeThumbnailBlob(file);
      if (thumbBlob) {
        const thumbPath = `v-${v.id.slice(0, 8)}/thumb-${storageObjectStem(path)}.jpg`;
        const { error: upThumbErr } = await supabase.storage
          .from("product-images")
          .upload(thumbPath, thumbBlob, { contentType: "image/jpeg" });
        if (!upThumbErr) {
          const {
            data: { publicUrl: thumbPublicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(thumbPath);
          nextThumbs.push(thumbPublicUrl);
        } else {
          nextThumbs.push(publicUrl);
        }
      } else {
        nextThumbs.push(publicUrl);
      }
    }
    setVariants((prev) =>
      prev.map((row, i) =>
        i === variantIndex
          ? { ...row, image_urls: nextUrls, image_thumb_urls: nextThumbs }
          : row,
      ),
    );
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

    if (variants.length < 1) {
      fe.variants = t("admin.products.fieldRequired");
    }
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].label.trim()) {
        fe.variants = t("admin.products.fieldRequired");
        break;
      }
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

    const normalizedColors = variants
      .map((v) => normalizeColorInput(v.color_hex))
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
      image_thumb_urls: imageThumbUrls.length ? imageThumbUrls : null,
      category: categoryResolved,
      material: material.trim() || null,
      badge: normalizeBadgeForForm(badge) || null,
      colors: normalizedColors.length ? normalizedColors : null,
      delivery_days_min: dMin,
      delivery_days_max: dMax,
    };

    if (isNew) {
      const { data: created, error: insErr } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (insErr || !created) {
        setError(insErr?.message ?? t("admin.products.createError"));
        setSubmitting(false);
        return;
      }
      const varErr = await persistVariants(supabase, created.id);
      if (varErr) {
        setError(varErr.message);
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
      const varErr = await persistVariants(supabase, idParam);
      if (varErr) {
        setError(varErr.message);
        setSubmitting(false);
        return;
      }
    }
    router.push("/admin/products");
    router.refresh();
  }

  function addVariantRow() {
    setVariants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        color_hex: "#64748B",
        image_urls: [],
        image_thumb_urls: [],
      },
    ]);
  }

  function removeVariantRow(index: number) {
    setVariants((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function removeVariantImageAt(variantIndex: number, imageIndex: number) {
    setVariants((prev) =>
      prev.map((row, i) =>
        i === variantIndex
          ? {
              ...row,
              image_urls: row.image_urls.filter((_, j) => j !== imageIndex),
              image_thumb_urls: row.image_thumb_urls.filter(
                (_, j) => j !== imageIndex,
              ),
            }
          : row,
      ),
    );
  }

  function removeImageAt(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setImageThumbUrls((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="animate-pulse min-w-0">
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
    <div className="min-w-0">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
        {isNew ? t("admin.products.formTitleNew") : t("admin.products.formTitleEdit")}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-4 max-w-xl space-y-5 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm sm:mt-6 sm:p-5"
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
          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder={t("admin.products.badgePlaceholder")}
            className={inputClass}
          />
          <p className="mt-1 font-dm text-[11px] text-eoi-ink2/80">
            {t("admin.products.badgeHint")}
          </p>
        </div>

        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2">
            {t("admin.products.variantsTitle")}
          </label>
          <p className="mt-1 font-dm text-[11px] text-eoi-ink2">
            {t("admin.products.variantsHint")}
          </p>
          {fieldErrors.variants ? (
            <p className="mt-1 font-dm text-xs text-red-600">{fieldErrors.variants}</p>
          ) : null}
          <div className="mt-3 space-y-4">
            {variants.map((v, i) => {
              const pickerSafe = /^#[0-9A-Fa-f]{6}$/i.test(v.color_hex)
                ? v.color_hex
                : "#000000";
              return (
                <div
                  key={v.id}
                  className="space-y-3 rounded-xl border border-eoi-border bg-eoi-pink-light/30 p-3"
                >
                  <div>
                    <label className="font-dm text-xs font-medium text-eoi-ink2">
                      {t("admin.products.variantLabelField")}
                    </label>
                    <input
                      value={v.label}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, j) =>
                            j === i ? { ...row, label: e.target.value } : row,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="font-dm text-xs font-medium text-eoi-ink2">
                      {t("admin.products.colorsLabel")}
                    </label>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        value={pickerSafe}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((row, j) =>
                              j === i
                                ? { ...row, color_hex: e.target.value.toUpperCase() }
                                : row,
                            ),
                          )
                        }
                        className="h-10 w-14 cursor-pointer rounded border border-eoi-border bg-white"
                        aria-label={`${t("admin.products.colorsLabel")} ${i + 1}`}
                      />
                      <input
                        value={v.color_hex}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((row, j) =>
                              j === i ? { ...row, color_hex: e.target.value } : row,
                            ),
                          )
                        }
                        placeholder="#RRGGBB"
                        className={`${inputClass} mt-0 min-w-[7rem] flex-1 font-mono text-xs`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-dm text-xs font-medium text-eoi-ink2">
                      {t("admin.products.variantImages")}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      onChange={(e) => void handleVariantFiles(i, e.target.files)}
                      className="mt-1 w-full font-dm text-sm text-eoi-ink2 file:mr-3 file:rounded-full file:border-0 file:bg-eoi-pink-light file:px-4 file:py-2 file:font-dm file:text-sm file:font-medium file:text-eoi-pink-dark"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {v.image_urls.map((url, ii) => (
                        <div key={`${url}-${ii}`} className="group relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={v.image_thumb_urls[ii] ?? url}
                            alt=""
                            className="h-16 w-16 rounded-lg border border-eoi-border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariantImageAt(i, ii)}
                            className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-red-600 shadow ring-1 ring-eoi-border"
                            aria-label={`${t("admin.products.colorsRemove")} ${ii + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariantRow(i)}
                    disabled={variants.length <= 1}
                    className="rounded-full border border-eoi-border bg-white px-3 py-2 font-dm text-xs text-eoi-ink disabled:opacity-40"
                  >
                    {t("admin.products.removeVariant")}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addVariantRow}
            className="mt-3 rounded-full border border-eoi-border bg-eoi-pink-light px-4 py-2 font-dm text-xs font-medium text-eoi-pink-dark"
          >
            {t("admin.products.addVariant")}
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
                  src={imageThumbUrls[i] ?? url}
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
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="/stl/example.stl"
            value={stlUrl}
            onChange={(e) => setStlUrl(e.target.value)}
            className={inputClass}
            aria-describedby="stl-url-hint"
          />
          <p id="stl-url-hint" className="mt-1 font-dm text-[11px] text-eoi-ink2/80">
            {t("admin.products.stlUrlHint")}
          </p>
        </div>

        {!isNew ? (
          <p className="font-dm text-sm">
            <Link
              href={`/admin/custom-order?productId=${encodeURIComponent(idParam)}&variantId=${encodeURIComponent(variants[0]?.id ?? "")}`}
              className="font-medium text-eoi-pink-dark underline underline-offset-2 hover:text-eoi-ink"
            >
              {t("admin.products.customOrderLink")}
            </Link>
          </p>
        ) : null}

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
