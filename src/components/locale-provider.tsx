"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import { t as tFn, translate } from "@/i18n/translate";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (next: Locale) => Promise<void>;
  t: (path: string, vars?: Record<string, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const router = useRouter();

  const setLocale = useCallback(
    async (next: Locale) => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages,
      setLocale,
      t: (path, vars) => tFn(messages, path, vars),
    }),
    [locale, messages, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }
  return ctx;
}

/** Client components: `t('store.cartTitle')` */
export function useTranslations() {
  const { t } = useLocaleContext();
  return t;
}

/** Raw string without interpolation helper */
export function useTranslate() {
  const { messages } = useLocaleContext();
  return (path: string) => translate(messages, path);
}
