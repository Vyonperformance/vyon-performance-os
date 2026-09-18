import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export function secretHash(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
export function generateIntegrationKey() {
  const prefix = `vyon_${randomBytes(12).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  return { prefix, hash: secretHash(secret), key: `${prefix}.${secret}` };
}
export function parseCredential(header: string | null) {
  const match = /^Bearer (vyon_[a-f0-9]{24})\.([a-f0-9]{64})$/.exec(header ?? "");
  return match ? { prefix: match[1]!, hash: secretHash(match[2]!) } : null;
}
export function equalHash(actual: string, expected: string) {
  const valid = /^[a-f0-9]{64}$/.test(expected);
  const target = valid ? expected : "0".repeat(64);
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(target, "hex")) && valid;
}
