import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";
import { logEvent } from "@/lib/logging";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const body = (await request.json()) as {
    type?: string;
    data?: {
      email_id?: string;
      id?: string;
      to?: string | string[];
      subject?: string;
      message_id?: string;
    };
  };

  const messageId =
    (typeof body.data?.email_id === "string" && body.data.email_id.trim()) ||
    (typeof body.data?.id === "string" && body.data.id.trim()) ||
    (typeof body.data?.message_id === "string" && body.data.message_id.trim());

  if (!messageId) return Response.json({ received: true });

  const eventType = (body.type ?? "").toLowerCase();
  const status =
    eventType === "email.delivered"
      ? "delivered"
      : eventType === "email.opened"
        ? "opened"
        : eventType === "email.clicked"
          ? "clicked"
          : eventType === "email.failed"
            ? "failed"
          : eventType === "email.bounced"
            ? "bounced"
            : eventType === "email.complained"
              ? "complained"
              : eventType === "email.error"
                ? "failed"
              : "sent";

  const supabase = createServiceClient();
  await supabase
    .from("email_logs")
    .update({
      event_type: eventType || "sent",
      status,
      payload: body as unknown as Json,
    })
    .eq("provider_message_id", messageId);

  logEvent("webhook.resend.updated", { ip, messageId, eventType, status });
  return Response.json({ received: true });
}
