import { AdminFinanceDashboard } from "@/components/admin/admin-finance-dashboard";
import { t } from "@/i18n/translate";
import { getServerI18n } from "@/lib/server-i18n";

export default async function AdminFinancePage() {
  const { messages } = await getServerI18n();
  const tr = (path: string) => t(messages, path);
  return (
    <div className="min-w-0">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
        {tr("admin.finance.title")}
      </h1>
      <p className="mt-1 font-dm text-sm text-eoi-ink2">
        {tr("admin.finance.subtitle")}
      </p>
      <AdminFinanceDashboard />
    </div>
  );
}
