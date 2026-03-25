import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

function siteOrigin(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  try {
    return new URL(raw ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,updated_at")
    .eq("is_active", true);

  const products = (!error && Array.isArray(data) ? data : []) as Array<{
    id: string;
    updated_at: string | null;
  }>;

  const productEntries: MetadataRoute.Sitemap = products.map((p) => {
    const lastmod = p.updated_at ? new Date(p.updated_at) : undefined;
    return {
      url: `${origin.origin}/products/${p.id}`,
      lastModified: lastmod,
      changeFrequency: "weekly",
      priority: 0.8,
    };
  });

  return [
    {
      url: `${origin.origin}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    ...productEntries,
  ];
}

