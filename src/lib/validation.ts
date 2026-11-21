import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export const memberSchema = z.object({
  name: z.string().min(2).max(120),
  title: z.string().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  pointOfContact: z.string().max(120).optional(),
  role: z.enum(["admin", "member"]).optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2).max(160),
  company: z.string().max(160).optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  value: z.coerce.number().min(0).optional(),
  source: z.string().max(80).optional(),
  ownerId: z.coerce.number().int().optional(),
  notes: z.string().max(2000).optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2).max(160),
  client: z.string().max(160).optional(),
  status: z.enum(["active", "on_hold", "done"]).optional(),
  ownerId: z.coerce.number().int().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(2).max(240),
  status: z.enum(["open", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  assigneeId: z.coerce.number().int().optional(),
  projectId: z.coerce.number().int().optional(),
});

export const updateSchema = z.object({
  body: z.string().min(3).max(2000),
  memberId: z.coerce.number().int().optional(),
});
