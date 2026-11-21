import { db } from "./index";
import { members, projects, leads, tasks, dailyUpdates } from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`TRUNCATE ai_events, daily_updates, tasks, leads, projects, members RESTART IDENTITY CASCADE`);

  const memberRows = await db.insert(members).values([
    { name: "Amina Yusuf", title: "Super Admin", email: "amina@kashfara.com", phone: "+254 712 000 001", role: "admin", pointOfContact: "Amina Yusuf" },
    { name: "David Otieno", title: "Sales Lead", email: "david@kashfara.com", phone: "+254 712 000 002", role: "member", pointOfContact: "Amina Yusuf" },
    { name: "Sara Hassan", title: "Project Manager", email: "sara@kashfara.com", phone: "+254 712 000 003", role: "member", pointOfContact: "Amina Yusuf" },
    { name: "Kwame Mensah", title: "Operations", email: "kwame@kashfara.com", phone: "+254 712 000 004", role: "member", pointOfContact: "Amina Yusuf" },
  ]).returning();

  const projectRows = await db.insert(projects).values([
    { name: "Kashfara Onboarding Revamp", client: "Internal", status: "active", ownerId: memberRows[2].id, dueDate: "2026-12-15" },
    { name: "Mombasa Retail Expansion", client: "Bluewave Retail", status: "active", ownerId: memberRows[1].id, dueDate: "2027-01-20" },
    { name: "CRM Data Migration", client: "Internal", status: "active", ownerId: memberRows[3].id, dueDate: "2026-11-30" },
    { name: "Q3 Marketing Site", client: "Kashfara Group", status: "done", ownerId: memberRows[2].id, dueDate: "2026-10-01" },
  ]).returning();

  await db.insert(leads).values([
    { name: "Grace Wanjiru", company: "Highland Foods", status: "qualified", value: "12500.00", source: "Referral", ownerId: memberRows[1].id },
    { name: "Tomas Berg", company: "Nordic Textiles", status: "contacted", value: "8200.00", source: "Website", ownerId: memberRows[1].id },
    { name: "Leila Abdi", company: "Coast Logistics", status: "new", value: "15000.00", source: "Event", ownerId: memberRows[0].id },
    { name: "Peter Njoroge", company: "Green Acres Farms", status: "won", value: "22000.00", source: "Referral", ownerId: memberRows[3].id },
    { name: "Miriam Achieng", company: "Savannah Tours", status: "contacted", value: "6400.00", source: "LinkedIn", ownerId: memberRows[1].id },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  await db.insert(tasks).values([
    { title: "Call Highland Foods about pilot scope", status: "in_progress", priority: "high", dueDate: today, assigneeId: memberRows[1].id, projectId: projectRows[1].id },
    { title: "Draft onboarding checklist v2", status: "open", priority: "medium", dueDate: today, assigneeId: memberRows[2].id, projectId: projectRows[0].id },
    { title: "Migrate legacy lead records", status: "in_progress", priority: "high", dueDate: today, assigneeId: memberRows[3].id, projectId: projectRows[2].id },
    { title: "Review weekly pipeline numbers", status: "open", priority: "low", dueDate: today, assigneeId: memberRows[0].id, projectId: null },
    { title: "Send Coast Logistics proposal", status: "done", priority: "high", dueDate: today, assigneeId: memberRows[1].id, projectId: null },
  ]);

  await db.insert(dailyUpdates).values([
    { memberId: memberRows[1].id, body: "Highland Foods moved to qualified — pilot scope agreed, sending contract Friday.", loggedDate: today },
    { memberId: memberRows[3].id, body: "CRM data migration 60% complete; leads table migrated, projects queued for tomorrow.", loggedDate: today },
  ]);

  console.log("Seed complete:", { members: memberRows.length, projects: projectRows.length });
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
