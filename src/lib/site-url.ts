/**
 * Domain công khai cho canonical, Open Graph, Twitter, sitemap, JSON-LD.
 * Không fallback sang VERCEL_URL — preview *.vercel.app khiến crawler lấy nhầm host
 * và Facebook báo lỗi MIME / og:image không hợp lệ.
 */
export const PRODUCTION_SITE_ORIGIN = "https://www.eoilinhtinh.com";

export function getSiteOriginUrl(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      /* ignore invalid env */
    }
  }
  if (process.env.NODE_ENV === "development") {
    return new URL("http://localhost:3000");
  }
  return new URL(PRODUCTION_SITE_ORIGIN);
}

export function getSiteOriginString(): string {
  return getSiteOriginUrl().origin;
}

/**
 * URL gốc cho link đơn custom / chia sẻ — không dùng localhost khi admin chạy local.
 * Ưu tiên NEXT_PUBLIC_CUSTOM_CHECKOUT_LINK_ORIGIN, rồi NEXT_PUBLIC_SITE_URL, rồi https://eoilinhtinh.com
 */
export function getCheckoutLinkOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_CUSTOM_CHECKOUT_LINK_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* ignore */
    }
  }
  return "https://eoilinhtinh.com";
}

/** Đường dẫn tương đối `/...` hoặc URL tuyệt đối — trả về URL tuyệt đối dùng đúng domain site. */
export function toAbsoluteSiteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl.trim())) {
    return pathOrUrl.trim();
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return new URL(path, getSiteOriginUrl()).href;
}
