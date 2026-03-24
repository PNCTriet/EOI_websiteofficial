"use client";

import type { Locale } from "@/i18n/config";
import { useLocaleContext } from "@/components/locale-provider";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "onDark";
}) {
  const { locale, setLocale } = useLocaleContext();

  const shell =
    variant === "onDark"
      ? "border-white/20 bg-white/10"
      : "border-eoi-border bg-white";

  return (
    <div
      className={`inline-flex rounded-full p-0.5 font-dm text-xs font-medium ${shell} ${className}`}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = locale === value;
        const activeCls =
          variant === "onDark"
            ? "bg-white text-eoi-ink"
            : "bg-eoi-ink text-white";
        const idleCls =
          variant === "onDark"
            ? "text-white/80 hover:text-white"
            : "text-eoi-ink2 hover:text-eoi-ink";
        return (
          <button
            key={value}
            type="button"
            onClick={() => void setLocale(value)}
            className={`min-h-[36px] min-w-[40px] rounded-full px-2.5 py-1 transition-colors ${
              active ? activeCls : idleCls
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
