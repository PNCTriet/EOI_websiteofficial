import { createClient } from "@supabase/supabase-js";
import type { Database, Json, OrderRow } from "@/types/database";

type SePayBody = {
  transferAmount?: number;
  amount?: number;
  content?: string;
  description?: string;
  [key: string]: Json | undefined;
};

function parseAmount(body: SePayBody): number | null {
  const n = body.transferAmount ?? body.amount;
  if (typeof n === "number" && !Number.isNaN(n)) return n;
  if (typeof n === "string") {
    const p = Number(n);
    return Number.isNaN(p) ? null : p;
  }
  return null;
}

export async function POST(request: Request) {
  let body: SePayBody;
  try {
    body = (await request.json()) as SePayBody;
  } catch {
    return Response.json({ success: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return Response.json({ success: true });
  }

  const supabase = createClient<Database>(url, key);

  const incomingAmount = parseAmount(body);

  const { data: logRow, error: logErr } = await supabase
    .from("sepay_logs")
    .insert({
      raw_payload: body as Json,
      amount: incomingAmount,
      matched: false,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const logId = !logErr && logRow ? logRow.id : null;

  const content = String(body.content ?? body.description ?? "");
  const refMatch = content.match(/EOI-[A-Z0-9]+/i);

  if (refMatch && incomingAmount !== null) {
    const sepayRef = refMatch[0].toUpperCase();

    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("sepay_ref", sepayRef)
      .eq("stage", "pending_payment")
      .maybeSingle();

    const order = orderData as OrderRow | null;

    if (order) {
      if (Math.abs(incomingAmount - order.total_amount) <= 1000) {
        await supabase
          .from("orders")
          .update({
            stage: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        await supabase.from("order_stage_logs").insert({
          order_id: order.id,
          from_stage: "pending_payment",
          to_stage: "paid",
        });

        if (logId) {
          await supabase
            .from("sepay_logs")
            .update({ order_id: order.id, matched: true })
            .eq("id", logId);
        }
      }
    }
  }

  return Response.json({ success: true });
}
