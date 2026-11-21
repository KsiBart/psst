import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters (19 MiB, 2 iterations).
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTS);
}

export async function verifyPassword(hashed: string | null | undefined, password: string) {
  if (!hashed) return false;
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// Used to spend the same time when an account doesn't exist (avoids user enumeration by timing).
let dummy: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummy ??= hashPassword("not-a-real-password");
  await verifyPassword(await dummy, password);
}
