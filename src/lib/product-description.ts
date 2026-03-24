/** Chuỗi có vẻ là HTML (tag) — dùng để chọn cách render / snippet thẻ. */
export function looksLikeProductHtml(raw: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(raw.trim());
}

/** Gỡ tag cho preview thẻ (trang chủ); giữ xuống dòng từ <br> / </p>. */
export function stripHtmlForPreview(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
