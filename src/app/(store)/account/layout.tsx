import Link from "next/link";
import { t } from "@/i18n/translate";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/server-i18n";
import { AccountSignOutButton } from "@/components/account/signout-button";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const fullName =
    (typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ?? email;

  return (
    <div className="px-5 py-6 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
          <p className="font-dm text-xs text-eoi-ink2">{t(messages, "store.accountSignedInAs")}</p>
          <p className="mt-1 font-syne text-lg font-bold text-eoi-ink">{fullName}</p>
          {email ? <p className="font-dm text-sm text-eoi-ink2">{email}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/account"
              className="rounded-full border border-eoi-border px-4 py-2 font-dm text-sm text-eoi-ink"
            >
              {t(messages, "store.accountTitle")}
            </Link>
            <Link
              href="/account/orders"
              className="rounded-full border border-eoi-border px-4 py-2 font-dm text-sm text-eoi-ink"
            >
              {t(messages, "store.accountOrdersTitle")}
            </Link>
            <AccountSignOutButton />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
