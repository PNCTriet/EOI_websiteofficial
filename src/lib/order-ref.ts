const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateSepayRef(): string {
  let ref = "EOI-";
  for (let i = 0; i < 6; i += 1) {
    ref += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)] ?? "A";
  }
  return ref;
}
