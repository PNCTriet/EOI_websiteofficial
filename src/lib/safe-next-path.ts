/**
 * Chỉ chấp nhận đường dẫn tương đối trong cùng site (chống open redirect).
 * Từ chối: URL tuyệt đối, "//host", "/\\host", ký tự điều khiển.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, "http://localhost");
    if (u.origin !== "http://localhost") return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}
