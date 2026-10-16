import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./env";

let cachedSecret: string | undefined;

/** SECRET_KEY_BASE。未設定なら初回に生成してデータ領域に保存する */
function secretKeyBase(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SECRET_KEY_BASE) return (cachedSecret = process.env.SECRET_KEY_BASE);

  const file = path.join(dataDir(), ".secret_key_base");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(file, randomBytes(48).toString("hex"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return (cachedSecret = fs.readFileSync(file, "utf8").trim());
}

function deriveKey(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secretKeyBase(), "wiki", purpose, 32));
}

/** AES-256-GCM で暗号化（MFA シークレットの保存用） */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("encryption"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("invalid encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey("encryption"), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
