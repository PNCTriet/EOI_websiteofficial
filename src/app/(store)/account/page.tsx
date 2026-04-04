import { t } from "@/i18n/translate";
import { createClient } from "@/lib/supabase/server";
import { claimOrdersMatchingEmail } from "@/lib/claim-orders-by-email";
import { getServerI18n } from "@/lib/server-i18n";
import { AccountProfileForm } from "@/components/account/profile-form";

export default async function AccountPage() {
  const { messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await claimOrdersMatchingEmail(user.id, user.email ?? undefined);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, phone, default_address")
    .eq("id", user.id)
    .maybeSingle();

  const addr = (profile?.default_address ?? {}) as Record<string, string | undefined>;

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink">
        {t(messages, "store.accountTitle")}
      </h1>
      <div className="mt-3 space-y-2 font-dm text-sm text-eoi-ink2">
        <p>
          <span className="font-medium text-eoi-ink">Email:</span> {user.email ?? t(messages, "common.dash")}
        </p>
        <p>
          <span className="font-medium text-eoi-ink">Name:</span>{" "}
          {profile?.full_name ?? t(messages, "common.dash")}
        </p>
        <p>
          <span className="font-medium text-eoi-ink">Phone:</span>{" "}
          {profile?.phone ?? t(messages, "common.dash")}
        </p>
        <p>
          <span className="font-medium text-eoi-ink">Default address:</span>{" "}
          {[
            addr.street,
            addr.ward,
            addr.district,
            addr.province,
          ]
            .filter(Boolean)
            .join(", ") || t(messages, "common.dash")}
        </p>
      </div>
      <AccountProfileForm
        userId={user.id}
        initialFullName={profile?.full_name ?? ""}
        initialPhone={profile?.phone ?? ""}
      />
    </div>
  );
}
