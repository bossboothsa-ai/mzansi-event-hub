import { createDecipheriv, createHash } from "node:crypto";

export function decryptSecret(value: string): string {
  const [ivHex, tagHex, encryptedHex] = value.split(":");
  const secret = process.env.PAYFAST_ENCRYPTION_SECRET;
  if (!secret || !ivHex || !tagHex || !encryptedHex) throw Object.assign(new Error("PayFast credential encryption is not configured."), { status: 503 });
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}
