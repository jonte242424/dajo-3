/**
 * HMAC-signerade avanmälningstokens.
 *
 * Vi sätter tokenen i List-Unsubscribe-URL:en som går ut med mejlen, och
 * endpointen verifierar den innan något tas bort ur databasen. Utan detta
 * kunde vem som helst skripta `DELETE FROM pilot_signups` för varje gissad
 * e-post.
 *
 * Återanvänder JWT_SECRET (via HKDF-liknande derivering) så vi inte behöver
 * ytterligare en env-variabel att hålla koll på.
 */
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

const SECRET_SOURCE =
  process.env.JWT_SECRET ??
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("JWT_SECRET krävs för unsub-HMAC.");
      })()
    : "dev-secret-change-in-prod-CHANGE-THIS-NOW");

const UNSUB_SECRET = crypto
  .createHmac("sha256", SECRET_SOURCE)
  .update("unsubscribe-v1")
  .digest();

export function unsubToken(email: string): string {
  return crypto
    .createHmac("sha256", UNSUB_SECRET)
    .update(email.trim().toLowerCase())
    .digest("base64url")
    .slice(0, 24);
}

export function verifyUnsubToken(email: string, token: unknown): boolean {
  if (typeof token !== "string" || !token) return false;
  const expected = unsubToken(email);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
