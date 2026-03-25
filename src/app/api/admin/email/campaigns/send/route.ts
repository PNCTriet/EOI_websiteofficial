import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { sendTemplatedEmail } from "@/lib/email-center";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    name?: string;
    templateKey?: string;
    audience?: "all_customers" | "paid_customers" | "custom";
    customRecipients?: string[];
  };

  const templateKey = body.templateKey?.trim();
  const campaignName = body.name?.trim() || `Campaign ${new Date().toISOString()}`;
  const audience = body.audience ?? "all_customers";
  if (!templateKey) return NextResponse.json({ error: "Missing templateKey" }, { status: 400 });

  const admin = createServiceClient();
  const customRecipients = Array.isArray(body.customRecipients)
    ? body.customRecipients.map((x) => x.trim()).filter(Boolean)
    : [];

  const { data: campaign, error: campaignErr } = await admin
    .from("email_campaigns")
    .insert({
      name: campaignName,
      template_key: templateKey,
      audience,
      custom_recipients: customRecipients,
      status: "sending",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (campaignErr || !campaign) return NextResponse.json({ error: campaignErr?.message ?? "create_failed" }, { status: 500 });

  let recipients: string[] = [];
  if (audience === "custom") {
    recipients = customRecipients;
  } else {
    let q = admin.from("orders").select("shipping_addr,paid_at");
    if (audience === "paid_customers") q = q.not("paid_at", "is", null);
    const { data } = await q.limit(5000);
    const set = new Set<string>();
    for (const row of data ?? []) {
      const addr = row.shipping_addr as Record<string, unknown> | null;
      const email = typeof addr?.email === "string" ? addr.email.trim().toLowerCase() : "";
      if (email) set.add(email);
    }
    recipients = [...set];
  }

  let sentCount = 0;
  let failedCount = 0;
  const failedSamples: string[] = [];
  for (const email of recipients) {
    const res = await sendTemplatedEmail({
      to: email,
      templateKey,
      campaignId: campaign.id,
      variables: {
        recipient_name: email.split("@")[0],
        site_url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      },
    });
    if (res.ok) sentCount += 1;
    else {
      failedCount += 1;
      if (failedSamples.length < 5) {
        const detail = "detail" in res && typeof res.detail === "string" ? res.detail : res.reason;
        failedSamples.push(`${email}: ${detail}`);
      }
    }
  }

  await admin
    .from("email_campaigns")
    .update({
      status: failedCount > 0 && sentCount === 0 ? "failed" : "sent",
      recipient_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
      last_error:
        failedCount > 0
          ? `${failedCount} failed. ${failedSamples.join(" | ")}`
          : null,
    })
    .eq("id", campaign.id);

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    failedSamples,
  });
}
