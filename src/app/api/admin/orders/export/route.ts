import { isUserAdmin } from "@/lib/auth-helpers";
import { orderCustomerDisplayName } from "@/lib/order-customer-display";
import { createClient } from "@/lib/supabase/server";
import type { Json, OrderStage } from "@/types/database";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const stageParam = searchParams.get("stage");
  const qParam = searchParams.get("q");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let q = supabase
    .from("orders")
    .select(
      "id, sepay_ref, total_amount, stage, created_at, paid_at, user_id, shipping_addr, tracking_number, shipping_carrier, customers ( name )"
    )
    .order("created_at", { ascending: false });

  if (stageParam && stageParam !== "all") {
    q = q.eq("stage", stageParam as OrderStage);
  }
  if (fromParam) {
    const d = new Date(fromParam);
    if (!Number.isNaN(d.getTime())) q = q.gte("created_at", d.toISOString());
  }
  if (toParam) {
    const d = new Date(toParam);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      q = q.lte("created_at", d.toISOString());
    }
  }

  const { data: rows, error } = await q.limit(8000);
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  type Row = {
    id: string;
    sepay_ref: string | null;
    total_amount: number;
    stage: OrderStage;
    created_at: string;
    paid_at: string | null;
    user_id: string | null;
    shipping_addr: Json | null;
    tracking_number: string | null;
    shipping_carrier: string | null;
    customers: { name: string } | null;
  };

  let list = (rows ?? []) as Row[];

  const userIds = [...new Set(list.map((o) => o.user_id).filter(Boolean))] as string[];
  let profileMap = new Map<string, { full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", userIds);
    profileMap = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name }]));
  }

  function displayName(o: Row): string {
    return (
      orderCustomerDisplayName(
        o.shipping_addr,
        o.customers?.name ?? null,
        o.user_id ? profileMap.get(o.user_id)?.full_name ?? null : null
      ) || ""
    );
  }

  if (qParam?.trim()) {
    const term = qParam.trim().toLowerCase();
    list = list.filter((o) => {
      const ref = (o.sepay_ref ?? o.id).toLowerCase();
      return ref.includes(term) || displayName(o).toLowerCase().includes(term);
    });
  }

  const header = [
    "id",
    "sepay_ref",
    "customer",
    "total_amount",
    "stage",
    "created_at",
    "paid_at",
    "shipping_carrier",
    "tracking_number",
  ];

  const lines = [
    header.join(","),
    ...list.map((o) =>
      [
        csvEscape(o.id),
        csvEscape(o.sepay_ref ?? ""),
        csvEscape(displayName(o)),
        String(o.total_amount),
        csvEscape(o.stage),
        csvEscape(o.created_at),
        csvEscape(o.paid_at ?? ""),
        csvEscape(o.shipping_carrier ?? ""),
        csvEscape(o.tracking_number ?? ""),
      ].join(",")
    ),
  ];

  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
