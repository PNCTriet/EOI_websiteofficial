import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CheckoutPendingClient } from "@/components/checkout/checkout-pending-client";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ access?: string }>;
};

export default async function CheckoutPendingPage({ params, searchParams }: Props) {
  const { orderId: intentId } = await params;
  const { access: accessQuery } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const selectIntent =
    "id,sepay_ref,amount,status,expires_at,order_id,hidden_from_account_list,link_access_token,user_id";

  type IntentRow = {
    id: string;
    sepay_ref: string | null;
    amount: number;
    status: string;
    expires_at: string;
    order_id: string | null;
    hidden_from_account_list: boolean;
    link_access_token: string | null;
    user_id: string;
  };

  let intent: IntentRow | null = null;

  if (user) {
    const { data } = await supabase
      .from("payment_intents")
      .select(selectIntent)
      .eq("id", intentId)
      .eq("user_id", user.id)
      .maybeSingle();
    intent = data as IntentRow | null;
  }

  if (
    !intent &&
    accessQuery &&
    typeof accessQuery === "string" &&
    accessQuery.length > 0
  ) {
    const admin = createServiceClient();
    const { data } = await admin
      .from("payment_intents")
      .select(selectIntent)
      .eq("id", intentId)
      .maybeSingle();
    const row = data as IntentRow | null;
    if (
      row &&
      row.hidden_from_account_list &&
      row.link_access_token &&
      row.link_access_token === accessQuery
    ) {
      intent = row;
    }
  }

  if (!intent) notFound();

  const accessOk =
    !intent.hidden_from_account_list ||
    !intent.link_access_token ||
    accessQuery === intent.link_access_token ||
    (user?.id != null && user.id === intent.user_id);

  if (!accessOk) notFound();

  if (intent.status === "paid" && intent.order_id) {
    const qs =
      intent.hidden_from_account_list && intent.link_access_token
        ? `?access=${encodeURIComponent(intent.link_access_token)}`
        : "";
    redirect(`/checkout/success/${intent.order_id}${qs}`);
  }

  return (
    <div className="px-5 py-6 md:px-6">
      <div className="mx-auto max-w-xl">
        <CheckoutPendingClient
          intentId={intent.id}
          sepayRef={intent.sepay_ref ?? ""}
          totalAmount={intent.amount}
          expiresAt={intent.expires_at}
          linkAccessToken={
            intent.hidden_from_account_list ? intent.link_access_token : null
          }
        />
      </div>
    </div>
  );
}
