import { db } from "@/db";
import { tasks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/lib/session";
import { jsonError, taskSchema } from "@/lib/validation";

export async function GET() {
  const rows = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  return Response.json({ tasks: rows });
}

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = taskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Task needs a title (and valid fields)");
  const { title, status, priority, dueDate, assigneeId, projectId } = parsed.data;
  const created = await db.insert(tasks).values({
    title,
    status: status ?? "open",
    priority: priority ?? "medium",
    dueDate: dueDate ?? null,
    assigneeId: assigneeId ?? null,
    projectId: projectId ?? null,
  }).returning();
  return Response.json({ task: created[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);
  const parsed = taskSchema.partial().extend({ id: z.coerce.number().int() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) return jsonError("Task id required");
  const { id, title, status, priority, dueDate, assigneeId, projectId } = parsed.data;
  const updated = await db.update(tasks).set({
    ...(title !== undefined ? { title } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(assigneeId !== undefined ? { assigneeId } : {}),
    ...(projectId !== undefined ? { projectId } : {}),
  }).where(eq(tasks.id, id)).returning();
  if (updated.length === 0) return jsonError("Task not found", 404);
  return Response.json({ task: updated[0] });
}
