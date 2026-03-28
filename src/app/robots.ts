import type { MetadataRoute } from "next";

const disallowPrivate = ["/admin", "/checkout", "/account"];

/**
 * Facebook / Meta dùng `facebookexternalhit` và `Facebot` để scrape OG.
 * Nếu chỉ có rule `User-agent: *`, debugger đôi khi cảnh báo — thêm allow rõ cho các bot này
 * (không bỏ disallow các route private).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "facebookexternalhit",
        allow: "/",
        disallow: disallowPrivate,
      },
      {
        userAgent: "Facebot",
        allow: "/",
        disallow: disallowPrivate,
      },
      {
        userAgent: "*",
        disallow: disallowPrivate,
      },
    ],
  };
}

