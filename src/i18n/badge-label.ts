import type { Messages } from "./dictionaries";
import { translate } from "./translate";

/** Map DB badge text to localized label; unknown values pass through. */
export function badgeLabel(messages: Messages, badge: string | null): string {
  if (!badge) return "";
  const u = badge.trim().toLowerCase();
  if (u === "hot") return translate(messages, "badges.hot");
  if (u === "mới" || u === "moi" || u === "new")
    return translate(messages, "badges.new");
  if (u === "sale") return translate(messages, "badges.sale");
  return badge;
}
