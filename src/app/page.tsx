import { db } from "@/db";
import { members } from "@/db/schema";
import { asc } from "drizzle-orm";
import { currentMember } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import TaskBoard from "@/components/TaskBoard";
import UpdatesFeed from "@/components/UpdatesFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const me = await currentMember();
  if (!me) return null;
  const team = await db.select({ id: members.id, name: members.name }).from(members).orderBy(asc(members.id));
  return (
    <DashboardShell me={me} team={team}>
      <div className="grid xl:grid-cols-2 gap-6">
        <TaskBoard team={team} />
        <UpdatesFeed meName={me.name} />
      </div>
    </DashboardShell>
  );
}
