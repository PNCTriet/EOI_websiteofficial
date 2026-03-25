import { AdminEmailCenter } from "@/components/admin/admin-email-center";

export default function AdminEmailsPage() {
  return (
    <div className="min-w-0">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
        Email Center
      </h1>
      <p className="mt-1 font-dm text-sm text-eoi-ink2">
        Manage templates, marketing campaigns, and delivery status from Resend webhook events.
      </p>
      <div className="mt-4">
        <AdminEmailCenter />
      </div>
    </div>
  );
}
