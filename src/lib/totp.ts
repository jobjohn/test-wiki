import { createHmac, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD = 30;

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

export function base32Decode(value: string): Buffer {
  let bits = "";
  for (const char of value.replace(/[\s=]/g, "").toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("invalid base32");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function timeStep(at: number = Date.now()): number {
  return Math.floor(at / 1000 / PERIOD);
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

/**
 * パスコードを検証し、一致した時間ステップを返す（不一致は null）。
 * 前後 1 ステップ（±30 秒）の時計ずれを許容し、afterStep 以前のステップは再利用として拒否する。
 */
export function verifyTotp(secret: string, code: string, afterStep = -1, at: number = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = timeStep(at);
  for (const step of [current, current - 1, current + 1]) {
    if (step > afterStep && totpAt(secret, step) === code) return step;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: String(PERIOD) });
  return `otpauth://totp/${label}?${params}`;
}
