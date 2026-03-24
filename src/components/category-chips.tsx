"use client";

import { useState } from "react";
import {
  Layers,
  Home,
  Flower2,
  Briefcase,
  Gift,
} from "lucide-react";
import { useTranslations } from "@/components/locale-provider";

const CATEGORIES: {
  id: string;
  labelKey:
    | "store.categories.all"
    | "store.categories.decor"
    | "store.categories.scene"
    | "store.categories.office"
    | "store.categories.gift";
  Icon: typeof Layers;
  boxBg: string;
}[] = [
  { id: "all", labelKey: "store.categories.all", Icon: Layers, boxBg: "bg-eoi-pink-light" },
  { id: "decor", labelKey: "store.categories.decor", Icon: Home, boxBg: "bg-eoi-blue-light" },
  { id: "scene", labelKey: "store.categories.scene", Icon: Flower2, boxBg: "bg-eoi-amber-light" },
  { id: "office", labelKey: "store.categories.office", Icon: Briefcase, boxBg: "bg-eoi-green-light" },
  { id: "gift", labelKey: "store.categories.gift", Icon: Gift, boxBg: "bg-eoi-purple-light" },
];

export function CategoryChips() {
  const [active, setActive] = useState("all");
  const t = useTranslations();

  return (
    <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 md:-mx-6 md:px-6">
      {CATEGORIES.map((c) => {
        const isActive = active === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`flex min-w-[72px] flex-shrink-0 flex-col items-center gap-1.5 rounded-none border-0 bg-transparent p-0`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${c.boxBg} ${
                isActive ? "outline outline-[2.5px] outline-eoi-ink" : ""
              }`}
            >
              <c.Icon size={26} strokeWidth={1.8} className="text-eoi-ink" />
            </span>
            <span className="font-dm text-[11px] font-medium text-eoi-ink">
              {t(c.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
