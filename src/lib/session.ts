import { cookies } from "next/headers";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, signSession, verifySessionToken } from "@/lib/session-token";

export { signSession, verifySessionToken, SESSION_COOKIE } from "@/lib/session-token";
export const ACCESS_PIN = process.env.ACCESS_PIN ?? "1944";

export async function currentMember() {
  const store = await cookies();
  const id = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const rows = await db.select().from(members).where(eq(members.id, id)).limit(1);
  return rows[0] ?? null;
}
