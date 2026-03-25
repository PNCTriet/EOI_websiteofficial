import { TrackOrderForm } from "@/components/track/track-order-form";
import { getServerI18n } from "@/lib/server-i18n";
import { t } from "@/i18n/translate";

export default async function TrackOrderPage() {
  const { messages } = await getServerI18n();

  return (
    <div className="px-5 py-8 md:px-6">
      <h1 className="font-syne text-2xl font-bold text-eoi-ink">{t(messages, "store.trackTitle")}</h1>
      <p className="mt-2 max-w-xl font-dm text-sm text-eoi-ink2">{t(messages, "store.trackSubtitle")}</p>
      <div className="mt-6">
        <TrackOrderForm />
      </div>
    </div>
  );
}
