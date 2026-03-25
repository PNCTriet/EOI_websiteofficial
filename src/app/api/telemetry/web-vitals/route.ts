import { NextResponse } from "next/server";
import { logEvent } from "@/lib/logging";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    value?: number;
    during?: string;
    navType?: string;
    deviceType?: string;
  };

  logEvent("telemetry.web_vitals", {
    name: body.name ?? "unknown",
    value: body.value ?? null,
    during: body.during ?? null,
    navType: body.navType ?? null,
    deviceType: body.deviceType ?? null,
  });

  return NextResponse.json({ ok: true });
}

