import { db } from "@/db";
import { members } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select({ id: members.id, name: members.name, title: members.title }).from(members).orderBy(asc(members.id));
  return Response.json({ members: rows });
}
