import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Signing for the sandbox: the per-learner sandbox key and the bookstore's own
// login tokens (real HS256 JWTs, so a learner can paste one into jwt.io).

const DEV_SECRET = "milestone-tracking-sandbox-dev-secret";

export function sandboxSecret(): string {
  return process.env.SANDBOX_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || DEV_SECRET;
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

const hmac = (data: string) => createHmac("sha256", sandboxSecret()).update(data).digest();

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return x.length === y.length && timingSafeEqual(x, y);
}

// ------------------------------------------------------------------ sandbox keys

/**
 * A key is `bk_<owner><sig>`: `owner` is derived from the account (so the same
 * account gets the same sandbox on every device, without exposing its id) and
 * `sig` proves the server issued it, so nobody can invent sandboxes.
 */
export function issueSandboxKey(subject: string): string {
  const owner = hmac(`owner:${subject}`).toString("hex").slice(0, 24);
  const sig = hmac(`key:${owner}`).toString("hex").slice(0, 16);

  return `bk_${owner}${sig}`;
}

/** The sandbox owner a key belongs to, or null when the key is not one we issued. */
export function verifySandboxKey(key: string | null): string | null {
  const match = /^bk_([0-9a-f]{24})([0-9a-f]{16})$/.exec(key?.trim() ?? "");

  if (!match) return null;

  const expected = hmac(`key:${match[1]}`).toString("hex").slice(0, 16);

  return safeEqual(expected, match[2]) ? match[1] : null;
}

// ------------------------------------------------------------------ passwords

/**
 * Practice-grade only: SHA-256 salted with the user id (so an email change never
 * breaks a login). A real service would use bcrypt or argon2.
 */
export function hashPassword(userId: number, password: string): string {
  return createHash("sha256").update(`bookstore:${userId}:${password}`).digest("hex");
}

// ------------------------------------------------------------------ JWT

export interface TokenClaims {
  sub: string;
  email: string;
  role: string;
  /** The sandbox the token was issued in — a token never works in someone else's sandbox. */
  sbx: string;
  iat: number;
  exp: number;
}

export const TOKEN_TTL_SECONDS = 60 * 60;

export function signToken(claims: TokenClaims): string {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const sig = b64url(hmac(`jwt:${head}.${body}`));

  return `${head}.${body}.${sig}`;
}

export type TokenCheck = { ok: true; claims: TokenClaims } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyToken(token: string, nowSeconds: number): TokenCheck {
  const parts = token.split(".");

  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [head, body, sig] = parts;

  if (!safeEqual(b64url(hmac(`jwt:${head}.${body}`)), sig)) return { ok: false, reason: "bad_signature" };

  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenClaims;

    if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) return { ok: false, reason: "expired" };

    return { ok: true, claims };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
