import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteOriginUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOriginUrl();
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

