import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/lib/session";
import { jsonError, leadSchema } from "@/lib/validation";

export async function GET() {
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt));
  return Response.json({ leads: rows });
}

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = leadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Lead needs a name");
  const d = parsed.data;
  const created = await db.insert(leads).values({
    name: d.name,
    company: d.company ?? null,
    status: d.status ?? "new",
    value: String(d.value ?? 0),
    source: d.source ?? null,
    ownerId: d.ownerId ?? me.id,
    notes: d.notes ?? null,
  }).returning();
  return Response.json({ lead: created[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = leadSchema.partial().extend({ id: z.coerce.number().int() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return jsonError("Lead id required");
  const { id, ...rest } = parsed.data;
  const updated = await db.update(leads).set({
    ...(rest.name !== undefined ? { name: rest.name } : {}),
    ...(rest.company !== undefined ? { company: rest.company } : {}),
    ...(rest.status !== undefined ? { status: rest.status } : {}),
    ...(rest.value !== undefined ? { value: String(rest.value) } : {}),
    ...(rest.source !== undefined ? { source: rest.source } : {}),
    ...(rest.ownerId !== undefined ? { ownerId: rest.ownerId } : {}),
    ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
  }).where(eq(leads.id, id)).returning();
  if (updated.length === 0) return jsonError("Lead not found", 404);
  return Response.json({ lead: updated[0] });
}
