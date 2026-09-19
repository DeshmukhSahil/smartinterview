import { createHmac, timingSafeEqual } from "node:crypto";

// Emailed candidate link: /interview/[id]/[token]. The token is an HMAC of the
// interview id + its access code under a server-only key, so it (a) never
// reveals the access code, (b) can't be forged or guessed without the key, and
// (c) stops working on its own if the access code is ever rotated. Nothing is
// stored -- it's recomputed on demand -- so no schema change is needed.
// 16 bytes of HMAC-SHA256 -> 22 base64url characters (128 bits), short enough
// to keep the link comfortable to shorten and share.
export const LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function key() {
  // INTERVIEW_LINK_SECRET is preferred so the link key can be rotated on its
  // own; the service-role key is always present server-side, so links still
  // work before that variable is set.
  const secret = process.env.INTERVIEW_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Hiring service configuration missing: INTERVIEW_LINK_SECRET");
  return secret;
}

export function interviewLinkToken(interviewId: string, passwordId: string) {
  return createHmac("sha256", key())
    .update(`interview-link:v1:${interviewId}:${passwordId}`)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

export function verifyInterviewLinkToken(interviewId: string, passwordId: string, token: string) {
  const expected = Buffer.from(interviewLinkToken(interviewId, passwordId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function interviewLoginUrl(interviewId: string, passwordId: string) {
  const origin = process.env.HIRING_PUBLIC_URL;
  if (!origin) throw new Error("Hiring service configuration missing: HIRING_PUBLIC_URL");
  return `${origin.replace(/\/$/, "")}/interview/${interviewId}/${interviewLinkToken(interviewId, passwordId)}`;
}
