import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateSecret, otpauthUri, timeStep, totpAt, verifyTotp } from "@/lib/totp";

// RFC 6238 のテストベクター（秘密鍵 "12345678901234567890"）
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp", () => {
  it("RFC 6238 のテストベクターと一致する", () => {
    expect(totpAt(RFC_SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(RFC_SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(RFC_SECRET, Math.floor(20000000000 / 30))).toBe("353130");
  });

  it("base32 を往復できる", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });

  it("前後 30 秒の時計ずれを許容し、それ以上は拒否する", () => {
    const at = 1_700_000_000_000;
    const step = timeStep(at);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step), -1, at)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), -1, at)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 1), -1, at)).toBe(step + 1);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 3), -1, at)).toBeNull();
  });

  it("使用済みのステップは再利用できない", () => {
    const at = 1_700_000_000_000;
    const step = timeStep(at);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step), step, at)).toBeNull();
  });

  it("6 桁の数字以外は拒否する", () => {
    expect(verifyTotp(RFC_SECRET, "12345")).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef")).toBeNull();
  });

  it("otpauth URI を作る", () => {
    const uri = otpauthUri("ABC", "wikiadmin", "開発 Wiki");
    expect(uri).toMatch(/^otpauth:\/\/totp\/%E9%96%8B/);
    expect(uri).toContain("secret=ABC");
  });
});
