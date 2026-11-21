// HMAC-signed session tokens using Web Crypto so middleware (Edge runtime)
// and Node code share one implementation.
const enc = new TextEncoder();
export const SESSION_COOKIE = "kashfara_session";

function secret() {
  return process.env.SESSION_SECRET ?? "kashfara-crm-local-secret-change-me";
}

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

export async function signSession(memberId: number) {
  const payload = `${memberId}.${Date.now()}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, ts, mac] = parts;
  const expected = await hmac(`${id}.${ts}`);
  if (mac !== expected) return null;
  const memberId = Number(id);
  return Number.isInteger(memberId) ? memberId : null;
}
