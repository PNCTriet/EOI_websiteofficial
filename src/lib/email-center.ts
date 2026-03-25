import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export type EmailTemplateKey =
  | "order_created"
  | "order_paid"
  | "order_shipped"
  | "marketing_broadcast"
  | (string & {});

type TemplateVariables = Record<string, string | number | null | undefined>;

function interpolate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value == null ? "" : String(value);
  });
}

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export async function sendTemplatedEmail(input: {
  to: string;
  templateKey: EmailTemplateKey;
  variables?: TemplateVariables;
  orderId?: string;
  campaignId?: string;
}) {
  const supabase = createServiceClient();
  const { data: tpl } = await supabase
    .from("email_templates")
    .select("key,subject,html,enabled")
    .eq("key", input.templateKey)
    .maybeSingle();

  if (!tpl || !tpl.enabled) {
    return { ok: false as const, reason: "template_missing_or_disabled" };
  }

  const subject = interpolate(tpl.subject, input.variables ?? {});
  const html = interpolate(tpl.html, input.variables ?? {});
  const from = process.env.RESEND_FROM_EMAIL ?? "EOI <no-reply@eoilinhtinh.com>";

  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html,
    });

    const providerError =
      typeof (result as { error?: unknown }).error === "object" &&
      (result as { error?: { message?: string } }).error
        ? (result as { error?: { message?: string } }).error
        : null;
    if (providerError) {
      const detail = providerError.message?.trim() || "resend_error";
      await supabase.from("email_logs").insert({
        provider: "resend",
        event_type: "failed",
        status: "failed",
        recipient_email: input.to,
        subject,
        template_key: input.templateKey,
        order_id: input.orderId ?? null,
        campaign_id: input.campaignId ?? null,
        error: detail,
        payload: result as unknown as Json,
      });
      return { ok: false as const, reason: "provider_error", detail };
    }

    const providerMessageId =
      (typeof (result as { data?: { id?: string } }).data?.id === "string"
        ? (result as { data?: { id?: string } }).data?.id
        : null) ??
      (typeof (result as { id?: string }).id === "string" ? (result as { id?: string }).id : null) ??
      null;

    await supabase.from("email_logs").insert({
      provider: "resend",
      provider_message_id: providerMessageId,
      event_type: "sent",
      status: "sent",
      recipient_email: input.to,
      subject,
      template_key: input.templateKey,
      order_id: input.orderId ?? null,
      campaign_id: input.campaignId ?? null,
      payload: result as unknown as Json,
    });

    return { ok: true as const, providerMessageId };
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "unknown_error";
    await supabase.from("email_logs").insert({
      provider: "resend",
      event_type: "failed",
      status: "failed",
      recipient_email: input.to,
      subject,
      template_key: input.templateKey,
      order_id: input.orderId ?? null,
      campaign_id: input.campaignId ?? null,
      error: detail,
      payload: { error: detail } as unknown as Json,
    });
    return { ok: false as const, reason: "send_failed", detail };
  }
}
