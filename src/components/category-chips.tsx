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

const CATEGORY_META = {
  decor: { labelKey: "store.categories.decor", Icon: Home, boxBg: "bg-eoi-blue-light" },
  scene: { labelKey: "store.categories.scene", Icon: Flower2, boxBg: "bg-eoi-amber-light" },
  office: { labelKey: "store.categories.office", Icon: Briefcase, boxBg: "bg-eoi-green-light" },
  gift: { labelKey: "store.categories.gift", Icon: Gift, boxBg: "bg-eoi-purple-light" },
} as const;

type CategoryId = keyof typeof CATEGORY_META;

export function CategoryChips({
  availableCategoryIds,
}: {
  availableCategoryIds?: string[];
}) {
  const [active, setActive] = useState("all");
  const t = useTranslations();

  const availableIds = Array.from(
    new Set((availableCategoryIds ?? []) as string[])
  ).filter((id): id is CategoryId => id in CATEGORY_META);

  // Keep "all" always visible; other chips only show if the catalog currently has them.
  const chips = [
    {
      id: "all" as const,
      labelKey: "store.categories.all",
      Icon: Layers,
      boxBg: "bg-eoi-pink-light",
    },
    ...availableIds.map((id) => ({
      id,
      labelKey: CATEGORY_META[id].labelKey,
      Icon: CATEGORY_META[id].Icon,
      boxBg: CATEGORY_META[id].boxBg,
    })),
  ];

  return (
    <div className="no-scrollbar -mx-5 flex items-center gap-3 overflow-x-auto px-5 py-3 md:-mx-6 md:px-6">
      {chips.map((c) => {
        const isActive = active === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className="flex min-w-[72px] flex-shrink-0 flex-col items-center gap-1.5 rounded-none border-0 bg-transparent px-0 py-1"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${c.boxBg} ${
                isActive ? "ring-2 ring-inset ring-eoi-ink" : ""
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
