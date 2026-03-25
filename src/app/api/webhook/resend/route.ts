import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type?: string;
    data?: { email_id?: string; to?: string | string[]; subject?: string };
  };

  const messageId = body.data?.email_id;
  if (!messageId) return Response.json({ received: true });

  const eventType = (body.type ?? "").toLowerCase();
  const status =
    eventType === "email.delivered"
      ? "delivered"
      : eventType === "email.opened"
        ? "opened"
        : eventType === "email.clicked"
          ? "clicked"
          : eventType === "email.bounced"
            ? "bounced"
            : eventType === "email.complained"
              ? "complained"
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

  return Response.json({ received: true });
}
