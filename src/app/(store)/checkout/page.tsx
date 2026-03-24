import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialAddress: {
    recipient_name?: string;
    phone?: string;
    street?: string;
    ward?: string;
    district?: string;
    province?: string;
  } = {};

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("default_address")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.default_address && typeof profile.default_address === "object") {
      initialAddress = profile.default_address as typeof initialAddress;
    }
  }

  return (
    <div className="px-5 py-6 md:px-6">
      <div className="mx-auto max-w-3xl">
        <CheckoutPageClient
          initialAddress={initialAddress}
          userInfo={{
            email: user?.email ?? "",
            fullName:
              (typeof user?.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : null) ??
              (typeof user?.user_metadata?.name === "string"
                ? user.user_metadata.name
                : null) ??
              "",
          }}
        />
      </div>
    </div>
  );
}
