import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies STL / 3MF bytes from Supabase Storage so the browser loads them same-origin.
 * Direct cross-origin fetches to Storage often fail CORS checks used by Three.js FileLoader.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw?.trim()) {
    return NextResponse.json({ error: "missing u" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "server config" }, { status: 500 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const allowed = new URL(baseUrl);
  if (target.hostname !== allowed.hostname) {
    return NextResponse.json({ error: "forbidden host" }, { status: 403 });
  }
  if (!target.pathname.startsWith("/storage/v1/object/")) {
    return NextResponse.json({ error: "forbidden path" }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    cache: "no-store",
    headers: { Accept: "application/octet-stream,*/*" },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "upstream" },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const buf = await upstream.arrayBuffer();
  const pathLower = target.pathname.toLowerCase();
  const contentType = pathLower.endsWith(".3mf")
    ? "model/3mf"
    : pathLower.endsWith(".stl")
      ? "model/stl"
      : "application/octet-stream";
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
