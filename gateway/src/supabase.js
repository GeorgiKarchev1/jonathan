// Reads team data from Supabase to ground the agent. Uses the service-role
// key so it can see ALL rows (bypassing RLS). READ-ONLY: this module never
// writes. The result is a compact, token-friendly snapshot string.
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let client = null;
function db() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const by = (rows, id) => rows.find((r) => r.id === id);
const nameOf = (rows, id, key = "name") => by(rows, id)?.[key] ?? "—";

/**
 * Build a compact snapshot of the workspace for the system prompt.
 * Caps list sizes so the prompt stays reasonable for large datasets.
 */
export async function buildSnapshot() {
  const sb = db();
  if (!sb) return "(Няма връзка към базата — отговаряй общо и кажи, че нямаш достъп до данните в момента.)";

  const [profiles, companies, projects, tasks] = await Promise.all([
    sb.from("profiles").select("id,name,email,role,title"),
    sb.from("companies").select("id,name,industry,notes"),
    sb.from("projects").select("id,name,status,company_id,owner_id,start_date,end_date,description").order("created_at", { ascending: false }),
    sb.from("tasks").select("id,title,status,priority,project_id,assignee_id,due_date").order("created_at", { ascending: false }).limit(300),
  ]);

  const err = [profiles, companies, projects, tasks].find((r) => r.error);
  if (err?.error) {
    console.error("[supabase] snapshot read failed:", err.error.message);
    return "(Грешка при четене на данните.)";
  }

  const U = profiles.data ?? [];
  const C = companies.data ?? [];
  const P = projects.data ?? [];
  const T = tasks.data ?? [];

  const statusBg = { planning: "планиране", active: "активен", on_hold: "изчакване", done: "завършен", todo: "за правене", in_progress: "в процес", review: "тестване" };
  const prioBg = { low: "нисък", medium: "среден", high: "висок", urgent: "спешен" };

  const lines = [];
  lines.push(`# Снимка на работното пространство (към момента)`);
  lines.push(`Екип: ${U.length} души, ${C.length} фирми, ${P.length} проекта, ${T.length} задачи (показани).`);

  if (U.length) {
    lines.push(`\n## Екип`);
    for (const u of U) lines.push(`- ${u.name || u.email} (${u.role}${u.title ? `, ${u.title}` : ""})`);
  }

  if (C.length) {
    lines.push(`\n## Фирми`);
    for (const c of C) lines.push(`- ${c.name}${c.industry ? ` — ${c.industry}` : ""}${c.notes ? ` · ${c.notes}` : ""}`);
  }

  if (P.length) {
    lines.push(`\n## Проекти`);
    for (const p of P) {
      const company = p.company_id ? ` · клиент: ${nameOf(C, p.company_id)}` : "";
      const owner = p.owner_id ? ` · отговорник: ${nameOf(U, p.owner_id)}` : "";
      lines.push(`- [${statusBg[p.status] ?? p.status}] ${p.name}${company}${owner}`);
    }
  }

  if (T.length) {
    lines.push(`\n## Задачи`);
    for (const t of T) {
      const proj = t.project_id ? ` (${nameOf(P, t.project_id)})` : "";
      const who = t.assignee_id ? ` → ${nameOf(U, t.assignee_id)}` : "";
      const due = t.due_date ? ` · срок ${t.due_date}` : "";
      lines.push(`- [${statusBg[t.status] ?? t.status}/${prioBg[t.priority] ?? t.priority}] ${t.title}${proj}${who}${due}`);
    }
  }

  return lines.join("\n");
}
