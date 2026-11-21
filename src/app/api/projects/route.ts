import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/lib/session";
import { jsonError, projectSchema } from "@/lib/validation";

export async function GET() {
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return Response.json({ projects: rows });
}

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = projectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Project needs a name");
  const d = parsed.data;
  const created = await db.insert(projects).values({
    name: d.name,
    client: d.client ?? null,
    status: d.status ?? "active",
    ownerId: d.ownerId ?? me.id,
    dueDate: d.dueDate ?? null,
  }).returning();
  return Response.json({ project: created[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = projectSchema.partial().extend({ id: z.coerce.number().int() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return jsonError("Project id required");
  const { id, ...rest } = parsed.data;
  const updated = await db.update(projects).set({
    ...(rest.name !== undefined ? { name: rest.name } : {}),
    ...(rest.client !== undefined ? { client: rest.client } : {}),
    ...(rest.status !== undefined ? { status: rest.status } : {}),
    ...(rest.ownerId !== undefined ? { ownerId: rest.ownerId } : {}),
    ...(rest.dueDate !== undefined ? { dueDate: rest.dueDate } : {}),
  }).where(eq(projects.id, id)).returning();
  if (updated.length === 0) return jsonError("Project not found", 404);
  return Response.json({ project: updated[0] });
}
