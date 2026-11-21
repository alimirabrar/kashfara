import { db } from "@/db";
import { members } from "@/db/schema";
import { asc } from "drizzle-orm";
import { currentMember } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import ProjectsList from "@/components/ProjectsList";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const me = await currentMember();
  if (!me) return null;
  const team = await db.select({ id: members.id, name: members.name }).from(members).orderBy(asc(members.id));
  return (
    <DashboardShell me={me} team={team}>
      <ProjectsList team={team} />
    </DashboardShell>
  );
}
