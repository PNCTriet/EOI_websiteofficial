import { createHmac, timingSafeEqual } from "crypto";

const SIG_ALG = "sha256";
const SIG_ENCODING = "hex" as const;

function getSecret(): string | null {
  const secret = process.env.EOI_PRODUCT_LINK_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

/**
 * Verify that a product thank-you link is valid (not forged).
 * Use this only on the server (e.g. in Server Components or Route Handlers).
 */
export function verifyProductSignature(
  productId: string,
  signature: string | null
): boolean {
  if (!productId || !signature || signature.length < 8) return false;
  const secret = getSecret();
  if (!secret) return false;
  try {
    const expected = createHmac(SIG_ALG, secret)
      .update(productId)
      .digest(SIG_ENCODING);
    if (expected.length !== signature.length || !/^[a-f0-9]+$/i.test(signature))
      return false;
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Generate a signed product thank-you URL for use in NFC tags.
 * Only run this in a secure environment (e.g. local script or protected admin API).
 * Base URL should be your site origin, e.g. https://eoilinhtinh.com
 */
export function buildProductThankYouUrl(
  productId: string,
  baseUrl: string
): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      "EOI_PRODUCT_LINK_SECRET must be set (min 16 characters) to generate links"
    );
  }
  const sig = createHmac(SIG_ALG, secret).update(productId).digest(SIG_ENCODING);
  const params = new URLSearchParams({ p: productId, sig });
  const path = `/product/thank-you?${params.toString()}`;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}
