import type { Messages } from "./dictionaries";

export function translate(messages: Messages, path: string): string {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

/** Same as translate, with `{key}` placeholders replaced from `vars`. */
export function t(
  messages: Messages,
  path: string,
  vars?: Record<string, string>
): string {
  let s = translate(messages, path);
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }
  return s;
}
