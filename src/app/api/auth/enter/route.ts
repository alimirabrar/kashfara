import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { ACCESS_PIN, SESSION_COOKIE, signSession } from "@/lib/session";
import { jsonError } from "@/lib/validation";

const bodySchema = z.object({
  pin: z.string().length(4),
  memberId: z.coerce.number().int().optional(),
  newName: z.string().min(2).max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter the 4-digit PIN");
  const { pin, memberId, newName } = parsed.data;

  if (pin !== ACCESS_PIN) {
    return jsonError("Wrong PIN. This workspace is secured.", 401);
  }

  let memberIdToUse = memberId ?? null;
  if (memberIdToUse) {
    const existing = await db.select().from(members).where(eq(members.id, memberIdToUse)).limit(1);
    if (existing.length === 0) memberIdToUse = null;
  }
  if (!memberIdToUse && newName) {
    const created = await db.insert(members).values({ name: newName, pointOfContact: "Amina Yusuf" }).returning();
    memberIdToUse = created[0].id;
  }
  if (!memberIdToUse) return jsonError("Select your name or create a profile", 400);

  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(memberIdToUse), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}
