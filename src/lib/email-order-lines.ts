/** Dòng đơn dùng trong email HTML (Resend). */
export type EmailOrderLineInput = {
  name: string;
  variant_label?: string | null;
  quantity: number;
  unit_price: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Bảng chi tiết SP cho template mail (tiếng Việt / VND).
 * Chèn vào HTML template qua biến {{order_lines_html}}.
 */
export function formatOrderLinesHtmlVi(lines: EmailOrderLineInput[]): string {
  if (!lines.length) {
    return '<p style="margin:0 0 12px;color:#666;">—</p>';
  }
  const body = lines
    .map((l) => {
      const sub = Math.max(0, l.quantity) * Math.max(0, l.unit_price);
      const variant = l.variant_label?.trim()
        ? ` <span style="color:#666;">· ${escapeHtml(l.variant_label.trim())}</span>`
        : "";
      return (
        `<tr>` +
        `<td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;">` +
        `<strong>${escapeHtml(l.name.trim() || "—")}</strong>${variant}` +
        `</td>` +
        `<td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${l.quantity}</td>` +
        `<td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${l.unit_price.toLocaleString("vi-VN")}đ</td>` +
        `<td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${sub.toLocaleString("vi-VN")}đ</td>` +
        `</tr>`
      );
    })
    .join("");

  return (
    `<table role="presentation" style="width:100%;max-width:560px;border-collapse:collapse;margin:0 0 16px;font-size:14px;">` +
    `<thead><tr>` +
    `<th style="text-align:left;padding:8px;border-bottom:2px solid #111;">Sản phẩm</th>` +
    `<th style="text-align:center;padding:8px;border-bottom:2px solid #111;width:48px;">SL</th>` +
    `<th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Đơn giá</th>` +
    `<th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Tạm tính</th>` +
    `</tr></thead>` +
    `<tbody>${body}</tbody>` +
    `</table>`
  );
}
