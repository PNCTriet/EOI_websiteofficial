import { randomBytes } from "crypto";

/** Token cho ?access= trên đơn / intent ẩn khỏi danh sách tài khoản. */
export function generateLinkAccessToken(): string {
  return randomBytes(20).toString("base64url");
}
