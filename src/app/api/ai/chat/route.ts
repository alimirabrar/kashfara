import { db } from "@/db";
import { aiEvents, leads, projects, tasks, dailyUpdates, members } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { currentMember } from "@/lib/session";
import { jsonError } from "@/lib/validation";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Create a new lead in the pipeline",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact person name" },
          company: { type: "string" },
          value: { type: "number", description: "Deal value in USD" },
          status: { type: "string", enum: ["new", "contacted", "qualified", "won", "lost"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Open a new project",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          client: { type: "string" },
          dueDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Add a daily task",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          assigneeName: { type: "string", description: "Full name of the team member" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Update a task's status by matching its title",
      parameters: {
        type: "object",
        properties: {
          titleMatch: { type: "string", description: "Part of the task title" },
          status: { type: "string", enum: ["open", "in_progress", "done"] },
        },
        required: ["titleMatch", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_update",
      description: "Log a daily update for the current member",
      parameters: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_kpis",
      description: "Get current CRM KPIs: active leads, projects, open tasks, updates today, pipeline value",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

async function runTool(name: string, args: any, memberId: number) {
  switch (name) {
    case "create_lead": {
      const created = await db.insert(leads).values({
        name: args.name, company: args.company ?? null, status: args.status ?? "new",
        value: String(args.value ?? 0), ownerId: memberId,
      }).returning();
      return { createdLeadId: created[0].id, summary: `Created lead "${args.name}"` };
    }
    case "create_project": {
      const created = await db.insert(projects).values({
        name: args.name, client: args.client ?? null, dueDate: args.dueDate ?? null, ownerId: memberId,
      }).returning();
      return { createdProjectId: created[0].id, summary: `Opened project "${args.name}"` };
    }
    case "create_task": {
      let assigneeId = memberId;
      if (args.assigneeName) {
        const m = await db.select().from(members).where(sql`lower(${members.name}) like ${"%" + args.assigneeName.toLowerCase() + "%"}`).limit(1);
        if (m[0]) assigneeId = m[0].id;
      }
      const created = await db.insert(tasks).values({
        title: args.title, priority: args.priority ?? "medium", assigneeId,
        dueDate: new Date().toISOString().slice(0, 10),
      }).returning();
      return { createdTaskId: created[0].id, summary: `Added task "${args.title}"` };
    }
    case "update_task_status": {
      const matches = await db.select().from(tasks).where(sql`lower(${tasks.title}) like ${"%" + String(args.titleMatch).toLowerCase() + "%"}`).limit(1);
      if (!matches[0]) return { error: `No task matching "${args.titleMatch}"` };
      await db.update(tasks).set({ status: args.status }).where(eq(tasks.id, matches[0].id));
      return { summary: `Task "${matches[0].title}" is now ${args.status}` };
    }
    case "log_update": {
      await db.insert(dailyUpdates).values({ memberId, body: args.body });
      return { summary: "Logged your daily update" };
    }
    case "get_kpis": {
      const [l] = await db.select({ n: sql<number>`count(*)::int` }).from(leads).where(sql`${leads.status} in ('new','contacted','qualified')`);
      const [p] = await db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.status, "active"));
      const [t] = await db.select({ n: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.status} in ('open','in_progress')`);
      const [v] = await db.select({ s: sql<string>`coalesce(sum(${leads.value}),0)` }).from(leads).where(sql`${leads.status} in ('new','contacted','qualified')`);
      return { activeLeads: l.n, activeProjects: p.n, openTasks: t.n, pipelineValue: Number(v.s) };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return jsonError("Unauthorized", 401);

  const apiKey = process.env.GROQ_API_KEY;
  const { messages } = await req.json().catch(() => ({ messages: [] }));
  if (!apiKey) {
    return Response.json({
      reply: "The AI command rail needs a Groq API key. Add GROQ_API_KEY to your environment (Settings › Vault) and it will create leads, open projects, update tasks and answer KPI questions from here.",
      keyMissing: true,
    });
  }

  const convo = (messages ?? []).slice(-10).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));
  convo.unshift({
    role: "system",
    content: `You are the Kashfara CRM control-room assistant. The current user is ${me.name} (${me.title}). Be brief and operational. Use tools to actually perform CRM actions when the user asks — never invent results. Today is ${new Date().toISOString().slice(0, 10)}.`,
  });

  let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "openai/gpt-oss-120b", messages: convo, tools: TOOLS, tool_choice: "auto", max_tokens: 600 }),
  });
  if (!response.ok) return jsonError(`Groq API error ${response.status}`, 502);
  let choice = (await response.json()).choices[0].message;

  // One round of tool execution then a final summary
  if (choice.tool_calls?.length) {
    convo.push(choice);
    const actions: string[] = [];
    for (const call of choice.tool_calls) {
      let args: any = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch {}
      const result = await runTool(call.function.name, args, me.id);
      if (result.summary) {
        await db.insert(aiEvents).values({ memberId: me.id, tool: call.function.name, summary: result.summary });
        actions.push(result.summary);
      }
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", messages: convo, max_tokens: 600 }),
    });
    if (!response.ok) return jsonError(`Groq API error ${response.status}`, 502);
    choice = (await response.json()).choices[0].message;
    return Response.json({ reply: choice.content || "Done.", actions });
  }

  return Response.json({ reply: choice.content || "Say the word and I'll create a lead, open a project or update a task.", actions: [] });
}

export async function GET() {
  const events = await db.select().from(aiEvents).orderBy(desc(aiEvents.createdAt)).limit(10);
  return Response.json({ events, keyConfigured: Boolean(process.env.GROQ_API_KEY) });
}
