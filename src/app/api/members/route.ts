import { db } from "@/db";
import { members } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/lib/session";
import { jsonError, memberSchema } from "@/lib/validation";

export async function GET() {
  const rows = await db.select().from(members).orderBy(asc(members.id));
  return Response.json({ members: rows });
}

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  if (me.role !== "admin") return jsonError("Only super admins can add members", 403);
  const parsed = memberSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Member needs a name");
  const d = parsed.data;
  const created = await db.insert(members).values({
    name: d.name,
    title: d.title ?? "Team Member",
    email: d.email || null,
    phone: d.phone || null,
    role: d.role ?? "member",
    pointOfContact: d.pointOfContact || me.name,
  }).returning();
  return Response.json({ member: created[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = memberSchema.partial().extend({ id: z.coerce.number().int() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return jsonError("Member id required");
  const { id, ...rest } = parsed.data;
  const updated = await db.update(members).set({
    ...(rest.name !== undefined ? { name: rest.name } : {}),
    ...(rest.title !== undefined ? { title: rest.title } : {}),
    ...(rest.email !== undefined ? { email: rest.email || null } : {}),
    ...(rest.phone !== undefined ? { phone: rest.phone } : {}),
    ...(rest.pointOfContact !== undefined ? { pointOfContact: rest.pointOfContact } : {}),
    ...(rest.role !== undefined && me.role === "admin" ? { role: rest.role } : {}),
  }).where(eq(members.id, id)).returning();
  if (updated.length === 0) return jsonError("Member not found", 404);
  return Response.json({ member: updated[0] });
}
