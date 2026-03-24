import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutPendingClient } from "@/components/checkout/checkout-pending-client";

type Props = { params: Promise<{ orderId: string }> };

export default async function CheckoutPendingPage({ params }: Props) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: order } = await supabase
    .from("orders")
    .select("id,sepay_ref,total_amount,stage,expires_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) notFound();

  return (
    <div className="px-5 py-6 md:px-6">
      <div className="mx-auto max-w-xl">
        <CheckoutPendingClient
          orderId={order.id}
          sepayRef={order.sepay_ref ?? order.id}
          totalAmount={order.total_amount}
          expiresAt={order.expires_at}
        />
      </div>
    </div>
  );
}
