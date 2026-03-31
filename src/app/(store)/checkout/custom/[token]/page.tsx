import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateSepayRef } from "@/lib/order-ref";
import { generateLinkAccessToken } from "@/lib/link-access-token";

type Props = { params: Promise<{ token: string }> };

async function generateUniqueSepayRef() {
  const admin = createServiceClient();
  for (let i = 0; i < 5; i += 1) {
    const ref = generateSepayRef();
    const { data } = await admin
      .from("payment_intents")
      .select("id")
      .eq("sepay_ref", ref)
      .maybeSingle();
    if (!data) return ref;
  }
  throw new Error("Cannot generate unique order ref");
}

export default async function CheckoutCustomTokenPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const admin = createServiceClient();
  const { data: link } = await admin
    .from("custom_checkout_links")
    .select(
      "id,token,cart_snapshot,shipping_addr,note,hide_from_account_list,claimed_user_id,payment_intent_id,expires_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (!link) notFound();
  if (new Date(link.expires_at).getTime() <= Date.now()) notFound();

  if (link.claimed_user_id && link.claimed_user_id !== user.id) {
    notFound();
  }

  if (link.payment_intent_id) {
    const { data: intent } = await admin
      .from("payment_intents")
      .select("id,status,order_id,user_id,link_access_token")
      .eq("id", link.payment_intent_id)
      .maybeSingle();
    if (!intent || intent.user_id !== user.id) notFound();
    const qs = intent.link_access_token
      ? `?access=${encodeURIComponent(intent.link_access_token)}`
      : "";
    if (intent.status === "paid" && intent.order_id) {
      redirect(`/checkout/success/${intent.order_id}${qs}`);
    }
    redirect(`/checkout/pending/${intent.id}${qs}`);
  }

  if (!Array.isArray(link.cart_snapshot) || !link.shipping_addr) notFound();

  const sepayRef = await generateUniqueSepayRef();
  const accessToken = link.hide_from_account_list ? generateLinkAccessToken() : null;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const total = (link.cart_snapshot as Array<Record<string, unknown>>).reduce((sum, row) => {
    const q = Number(row.quantity ?? 0);
    const p = Number(row.price ?? 0);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return sum;
    return sum + Math.max(0, Math.floor(q)) * Math.max(0, Math.floor(p));
  }, 0);

  if (total <= 0) notFound();

  const { data: intent, error } = await admin
    .from("payment_intents")
    .insert({
      user_id: user.id,
      sepay_ref: sepayRef,
      amount: total,
      cart_snapshot: link.cart_snapshot,
      shipping_addr: link.shipping_addr,
      note: link.note,
      expires_at: expiresAt,
      hidden_from_account_list: link.hide_from_account_list,
      link_access_token: accessToken,
    })
    .select("id")
    .single();
  if (error || !intent) notFound();

  await admin
    .from("custom_checkout_links")
    .update({ claimed_user_id: user.id, payment_intent_id: intent.id })
    .eq("id", link.id);

  const qs = accessToken ? `?access=${encodeURIComponent(accessToken)}` : "";
  redirect(`/checkout/pending/${intent.id}${qs}`);
}

