import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateSepayRef } from "@/lib/order-ref";
import { generateLinkAccessToken } from "@/lib/link-access-token";
import {
  createOrderDirectFromSnapshot,
  totalFromCartSnapshot,
} from "@/lib/create-order-from-cart-snapshot";
import type { Json } from "@/types/database";

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

async function generateUniqueOrderSepayRef() {
  const admin = createServiceClient();
  for (let i = 0; i < 5; i += 1) {
    const ref = generateSepayRef();
    const { data } = await admin
      .from("orders")
      .select("id")
      .eq("sepay_ref", ref)
      .maybeSingle();
    if (!data) return ref;
  }
  throw new Error("Cannot generate unique order ref");
}

type CustomLinkRow = {
  id: string;
  token: string;
  cart_snapshot: Json;
  shipping_addr: Json;
  note: string | null;
  hide_from_account_list: boolean;
  claimed_user_id: string | null;
  payment_intent_id: string | null;
  order_id: string | null;
  expires_at: string;
  payment_mode?: string | null;
};

export default async function CheckoutCustomTokenPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceClient();
  const { data: linkRaw } = await admin
    .from("custom_checkout_links")
    .select(
      "id,token,cart_snapshot,shipping_addr,note,hide_from_account_list,claimed_user_id,payment_intent_id,order_id,expires_at,payment_mode",
    )
    .eq("token", token)
    .maybeSingle();
  if (!linkRaw) notFound();
  const link = linkRaw as CustomLinkRow;
  if (new Date(link.expires_at).getTime() <= Date.now()) notFound();

  const paymentMode =
    link.payment_mode === "cod" || link.payment_mode === "pay_later"
      ? link.payment_mode
      : "bank_transfer";

  // Đơn COD / thanh toán sau đã tạo — ai có link cũng xem được success (access trên order)
  if (link.order_id) {
    const { data: ord } = await admin
      .from("orders")
      .select("id,link_access_token,hidden_from_account_list")
      .eq("id", link.order_id)
      .maybeSingle();
    if (!ord) notFound();
    const qs =
      ord.hidden_from_account_list && ord.link_access_token
        ? `?access=${encodeURIComponent(ord.link_access_token)}`
        : "";
    redirect(`/checkout/success/${ord.id}${qs}`);
  }

  // Đã có payment intent — chuyển tiếp không cần đúng user (dùng ?access=)
  if (link.payment_intent_id) {
    const { data: intent } = await admin
      .from("payment_intents")
      .select("id,status,order_id,user_id,link_access_token")
      .eq("id", link.payment_intent_id)
      .maybeSingle();
    if (!intent) notFound();
    const qs = intent.link_access_token
      ? `?access=${encodeURIComponent(intent.link_access_token)}`
      : "";
    if (intent.status === "paid" && intent.order_id) {
      redirect(`/checkout/success/${intent.order_id}${qs}`);
    }
    redirect(`/checkout/pending/${intent.id}${qs}`);
  }

  if (!Array.isArray(link.cart_snapshot) || !link.shipping_addr) notFound();

  const total = totalFromCartSnapshot(link.cart_snapshot);
  if (total <= 0) notFound();

  const loginUrl = `/login?next=${encodeURIComponent(`/checkout/custom/${token}`)}`;

  // COD / thanh toán sau: cần đăng nhập để gắn user_id; tạo đơn trực tiếp
  if (paymentMode === "cod" || paymentMode === "pay_later") {
    if (!user) redirect(loginUrl);

    if (link.claimed_user_id && link.claimed_user_id !== user.id) {
      notFound();
    }

    const accessToken = link.hide_from_account_list ? generateLinkAccessToken() : null;
    const sepayRef = await generateUniqueOrderSepayRef();
    const pm = paymentMode === "cod" ? "cod" : "pay_later";

    const created = await createOrderDirectFromSnapshot(
      admin,
      {
        userId: user.id,
        totalAmount: total,
        sepayRef,
        shippingAddr: link.shipping_addr as Json,
        note: link.note,
        paymentMethod: pm,
        hiddenFromAccountList: link.hide_from_account_list,
        linkAccessToken: accessToken,
        initialStage: "processing",
        paidAt: null,
      },
      link.cart_snapshot,
    );

    if (!created.ok || !created.orderId) notFound();

    await admin
      .from("custom_checkout_links")
      .update({
        claimed_user_id: user.id,
        order_id: created.orderId,
      })
      .eq("id", link.id);

    const qs = accessToken ? `?access=${encodeURIComponent(accessToken)}` : "";
    redirect(`/checkout/success/${created.orderId}${qs}`);
  }

  // Chuyển khoản: cần đăng nhập để tạo payment intent
  if (!user) redirect(loginUrl);

  if (link.claimed_user_id && link.claimed_user_id !== user.id) {
    notFound();
  }

  const sepayRef = await generateUniqueSepayRef();
  const accessToken = link.hide_from_account_list ? generateLinkAccessToken() : null;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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
