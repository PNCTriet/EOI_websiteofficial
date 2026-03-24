import { User } from "lucide-react";
import { t } from "@/i18n/translate";
import { getServerI18n } from "@/lib/server-i18n";

export default async function AccountPage() {
  const { messages } = await getServerI18n();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      <User size={22} strokeWidth={1.8} className="text-eoi-ink2" aria-hidden />
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink">
        {t(messages, "store.accountTitle")}
      </h1>
      <p className="max-w-sm font-dm text-sm text-eoi-ink2">
        {t(messages, "store.accountComingSoon")}
      </p>
    </div>
  );
}
