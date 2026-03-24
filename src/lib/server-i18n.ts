import { getDictionary } from "@/i18n/dictionaries";
import { t } from "@/i18n/translate";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";

export async function getServerI18n(): Promise<{
  locale: Locale;
  messages: Messages;
  t: (path: string, vars?: Record<string, string>) => string;
}> {
  const locale = await getLocale();
  const messages = getDictionary(locale);
  return {
    locale,
    messages,
    t: (path, vars) => t(messages, path, vars),
  };
}
