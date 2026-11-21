import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull().default("Team Member"),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("member"), // 'admin' | 'member'
  pointOfContact: text("point_of_contact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  status: text("status").notNull().default("new"), // new | contacted | qualified | won | lost
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  source: text("source"),
  ownerId: integer("owner_id").references(() => members.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  client: text("client"),
  status: text("status").notNull().default("active"), // active | on_hold | done
  ownerId: integer("owner_id").references(() => members.id),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("open"), // open | in_progress | done
  priority: text("priority").notNull().default("medium"), // low | medium | high
  dueDate: date("due_date"),
  assigneeId: integer("assignee_id").references(() => members.id),
  projectId: integer("project_id").references(() => projects.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dailyUpdates = pgTable("daily_updates", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  body: text("body").notNull(),
  loggedDate: date("logged_date").notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiEvents = pgTable("ai_events", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  tool: text("tool").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
