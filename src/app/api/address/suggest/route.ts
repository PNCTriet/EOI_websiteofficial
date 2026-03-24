import { NextResponse } from "next/server";

function normalizeType(v: string | null): "street" | "district" | "city" {
  if (v === "district") return "district";
  if (v === "city") return "city";
  return "street";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = normalizeType(searchParams.get("type"));
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  const query =
    type === "city"
      ? `${q}, Viet Nam`
      : type === "district"
        ? `${q}, Viet Nam`
        : `${q}, Viet Nam`;
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=vn&limit=6&q=" +
    encodeURIComponent(query);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EOI-Website/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const data = (await res.json()) as Array<{ display_name?: string; address?: Record<string, string> }>;

    const suggestions = data
      .map((row) => {
        const a = row.address ?? {};
        return {
          full: row.display_name ?? "",
          street: a.road ?? a.pedestrian ?? a.neighbourhood ?? "",
          ward: a.suburb ?? a.neighbourhood ?? a.quarter ?? "",
          district: a.city_district ?? a.county ?? a.state_district ?? "",
          province: a.city ?? a.state ?? a.region ?? "",
        };
      })
      .filter((x) => x.full);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
