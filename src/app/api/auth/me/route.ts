import { cookies } from "next/headers";
import { SESSION_COOKIE, currentMember } from "@/lib/session";

export async function GET() {
  const member = await currentMember();
  if (!member) return Response.json({ member: null }, { status: 401 });
  return Response.json({ member });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
