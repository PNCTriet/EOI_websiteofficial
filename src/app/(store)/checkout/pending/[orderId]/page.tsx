import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutPendingClient } from "@/components/checkout/checkout-pending-client";

type Props = { params: Promise<{ orderId: string }> };

export default async function CheckoutPendingPage({ params }: Props) {
  const { orderId: intentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: intent } = await supabase
    .from("payment_intents")
    .select("id,sepay_ref,amount,status,expires_at,order_id")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!intent) notFound();

  if (intent.status === "paid" && intent.order_id) redirect(`/checkout/success/${intent.order_id}`);

  return (
    <div className="px-5 py-6 md:px-6">
      <div className="mx-auto max-w-xl">
        <CheckoutPendingClient
          intentId={intent.id}
          sepayRef={intent.sepay_ref}
          totalAmount={intent.amount}
          expiresAt={intent.expires_at}
        />
      </div>
    </div>
  );
}
