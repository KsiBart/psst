import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Unguessable, URL-friendly code (no look-alike characters). */
export function randomCode(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** 256-bit secret token for cookies / reset links. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function assignmentKey(): Buffer {
  const raw = process.env.ASSIGNMENT_KEY;
  if (!raw) throw new Error("ASSIGNMENT_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ASSIGNMENT_KEY must be 32 bytes, base64 encoded");
  return key;
}

/**
 * Encrypts the receiver id with AES-256-GCM. The giver id is bound as
 * associated data, so a sealed value cannot be moved to another row.
 */
export function sealReceiver(giverId: string, receiverId: string, key = assignmentKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(giverId));
  const enc = Buffer.concat([cipher.update(receiverId, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function openReceiver(giverId: string, sealed: string, key = assignmentKey()): string {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(giverId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
