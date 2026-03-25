import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Cố định root = thư mục chứa file này (tránh Next infer sai khi có lockfile ở thư mục cha → MODULE_NOT_FOUND / HMR lỗi). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
