"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  imageUrls: string[] | null;
  thumbUrls?: string[] | null;
  accentBg: string | null;
  emptyLabel?: string;
};

/** Khung 4:5, ảnh object-cover (lấp đầy thẻ, có thể cắt nhẹ viền). Nhiều ảnh: thumbnail bên dưới. */
export function ProductImageGallery({
  imageUrls,
  thumbUrls,
  accentBg,
  emptyLabel = "3D",
}: Props) {
  const urls = (imageUrls ?? []).filter(Boolean);
  const thumbs = (thumbUrls ?? []).filter(Boolean);
  const [active, setActive] = useState(0);
  const safeIndex = urls.length ? Math.min(active, urls.length - 1) : 0;
  const main = urls[safeIndex];

  const thumbFor = (i: number) => {
    if (thumbs.length === urls.length) return thumbs[i] ?? urls[i] ?? "";
    if (thumbs.length > 0) return thumbs[Math.min(i, thumbs.length - 1)] ?? urls[i] ?? "";
    return urls[i] ?? "";
  };

  return (
    <div className="w-full">
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl"
        style={{
          background: accentBg ?? "var(--eoi-pink-light)",
        }}
      >
        {main ? (
          <Image
            src={main}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-syne text-5xl font-extrabold text-eoi-ink/15">
              {emptyLabel}
            </span>
          </div>
        )}
      </div>

      {urls.length > 1 ? (
        <div
          className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Product images"
        >
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              role="tab"
              aria-selected={safeIndex === i}
              onClick={() => setActive(i)}
              className={`relative h-[72px] w-[58px] flex-shrink-0 overflow-hidden rounded-xl border-2 bg-eoi-surface transition-colors ${
                safeIndex === i
                  ? "border-eoi-ink"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              style={{
                background:
                  safeIndex === i ? undefined : accentBg ?? "var(--eoi-pink-light)",
              }}
            >
              <Image
                src={thumbFor(i)}
                alt=""
                fill
                sizes="58px"
                className="object-cover object-center"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
