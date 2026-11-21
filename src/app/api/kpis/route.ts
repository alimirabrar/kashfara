import { db } from "@/db";
import { dailyUpdates, leads, members, projects, tasks } from "@/db/schema";
import { and, count, eq, sql } from "drizzle-orm";

export async function GET() {
  const [activeLeads] = await db.select({ n: count() }).from(leads).where(sql`${leads.status} in ('new','contacted','qualified')`);
  const [activeProjects] = await db.select({ n: count() }).from(projects).where(eq(projects.status, "active"));
  const [openTasks] = await db.select({ n: count() }).from(tasks).where(sql`${tasks.status} in ('open','in_progress')`);
  const [doneTasks] = await db.select({ n: count() }).from(tasks).where(eq(tasks.status, "done"));
  const [teamSize] = await db.select({ n: count() }).from(members);
  const [updatesToday] = await db.select({ n: count() }).from(dailyUpdates).where(and(sql`${dailyUpdates.loggedDate} = CURRENT_DATE`));
  const [pipelineValue] = await db.select({ v: sql<string>`coalesce(sum(${leads.value}), 0)` }).from(leads).where(sql`${leads.status} in ('new','contacted','qualified')`);

  return Response.json({
    kpis: {
      activeLeads: activeLeads.n,
      activeProjects: activeProjects.n,
      openTasks: openTasks.n,
      doneTasks: doneTasks.n,
      teamSize: teamSize.n,
      updatesToday: updatesToday.n,
      pipelineValue: Number(pipelineValue.v),
    },
  });
}
