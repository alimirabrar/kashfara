import { db } from "@/db";
import { dailyUpdates, members } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { currentMember } from "@/lib/session";
import { jsonError, updateSchema } from "@/lib/validation";

export async function GET() {
  const rows = await db
    .select({
      id: dailyUpdates.id,
      body: dailyUpdates.body,
      loggedDate: dailyUpdates.loggedDate,
      createdAt: dailyUpdates.createdAt,
      memberName: members.name,
      memberTitle: members.title,
    })
    .from(dailyUpdates)
    .leftJoin(members, eq(dailyUpdates.memberId, members.id))
    .orderBy(desc(dailyUpdates.createdAt))
    .limit(50);
  return Response.json({ updates: rows });
}

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Write your update (at least 3 characters)");
  const created = await db.insert(dailyUpdates).values({
    memberId: me.id,
    body: parsed.data.body,
  }).returning();
  return Response.json({ update: created[0] }, { status: 201 });
}

export async function DELETE(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return jsonError("id required");
  await db.delete(dailyUpdates).where(eq(dailyUpdates.id, id));
  return Response.json({ ok: true });
}
