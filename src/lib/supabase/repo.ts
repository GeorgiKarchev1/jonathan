// ============================================================
// Supabase data access for Atlas / Justin.
// Maps between the snake_case DB rows and the camelCase domain
// types in ../types, and exposes load-all + per-entity writes.
// The store calls these in write-through fashion (optimistic
// local update first, then a background save here).
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Agent,
  Attachment,
  BoardColumn,
  ChatMessage,
  Company,
  Conversation,
  FeedbackThread,
  Folder,
  Project,
  Task,
  TimeLog,
  User,
} from "../types";

type DB = SupabaseClient;

// loadAll returns everything except the current-user id, which the
// store fills from the auth session.
export interface LoadedData {
  users: User[];
  companies: Company[];
  projects: Project[];
  tasks: Task[];
  attachments: Attachment[];
  folders: Folder[];
  agents: Agent[];
  boardColumns: BoardColumn[];
  conversations: Conversation[];
  feedback: FeedbackThread[];
}

const ATTACHMENTS_BUCKET = "attachments";

// ---------- helpers ----------
type Row = Record<string, unknown>;
const orNull = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);

function groupBy<T, K extends string>(items: T[], key: (t: T) => K | undefined): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    (out[k] ??= []).push(it);
  }
  return out;
}

// ---------- row → domain ----------
function userFromRow(r: Row): User {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    email: (r.email as string) ?? "",
    role: (r.role as User["role"]) ?? "member",
    color: (r.color as string) ?? "#8b5cf6",
    title: (r.title as string) ?? undefined,
  };
}

function companyFromRow(r: Row): Company {
  return {
    id: r.id as string,
    name: r.name as string,
    industry: (r.industry as string) ?? undefined,
    contactName: (r.contact_name as string) ?? undefined,
    contactEmail: (r.contact_email as string) ?? undefined,
    website: (r.website as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function projectFromRow(r: Row, memberIds: string[]): Project {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    companyId: (r.company_id as string) ?? undefined,
    status: (r.status as Project["status"]) ?? "planning",
    color: (r.color as string) ?? "#8b5cf6",
    ownerId: (r.owner_id as string) ?? "",
    memberIds,
    startDate: (r.start_date as string) ?? undefined,
    endDate: (r.end_date as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function timeLogFromRow(r: Row): TimeLog {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    startDate: r.start_date as string,
    endDate: (r.end_date as string) ?? undefined,
    hours: (r.hours as number) ?? undefined,
    note: (r.note as string) ?? undefined,
  };
}

function taskFromRow(r: Row, timeLogs: TimeLog[]): Task {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    title: r.title as string,
    description: (r.description as string) ?? undefined,
    status: (r.status as Task["status"]) ?? "todo",
    columnId: (r.column_id as string) ?? undefined,
    priority: (r.priority as Task["priority"]) ?? "medium",
    assigneeId: (r.assignee_id as string) ?? undefined,
    dueDate: (r.due_date as string) ?? undefined,
    timeLogs,
    createdAt: r.created_at as string,
    completedAt: (r.completed_at as string) ?? undefined,
    order: (r.order as number) ?? 0,
  };
}

function folderFromRow(r: Row): Folder {
  return {
    id: r.id as string,
    name: r.name as string,
    companyId: (r.company_id as string) ?? undefined,
    projectId: (r.project_id as string) ?? undefined,
    parentId: (r.parent_id as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function attachmentFromRow(r: Row): Attachment {
  return {
    id: r.id as string,
    companyId: (r.company_id as string) ?? undefined,
    projectId: (r.project_id as string) ?? undefined,
    taskId: (r.task_id as string) ?? undefined,
    folderId: (r.folder_id as string) ?? undefined,
    kind: (r.kind as Attachment["kind"]) ?? "file",
    name: r.name as string,
    url: (r.url as string) ?? undefined,
    body: (r.body as string) ?? undefined,
    mime: (r.mime as string) ?? undefined,
    size: (r.size as number) ?? undefined,
    uploadedBy: (r.uploaded_by as string) ?? "",
    createdAt: r.created_at as string,
  };
}

function agentFromRow(r: Row): Agent {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    instructions: (r.instructions as string) ?? undefined,
    model: (r.model as string) ?? "Claude Opus 4.8",
    color: (r.color as string) ?? "#8b5cf6",
    skills: (r.skills as string[]) ?? [],
    companyId: (r.company_id as string) ?? undefined,
    projectId: (r.project_id as string) ?? undefined,
    status: (r.status as Agent["status"]) ?? "active",
    createdAt: r.created_at as string,
  };
}

function messageFromRow(r: Row): ChatMessage {
  return {
    id: r.id as string,
    role: r.role as ChatMessage["role"],
    content: r.content as string,
    action: (r.action as ChatMessage["action"]) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function conversationFromRow(r: Row, messages: ChatMessage[]): Conversation {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "Нов чат",
    projectId: (r.project_id as string) ?? undefined,
    taskId: (r.task_id as string) ?? undefined,
    agentId: (r.agent_id as string) ?? undefined,
    messages,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function boardColumnFromRow(r: Row): BoardColumn {
  return { id: r.id as string, name: r.name as string, color: (r.color as string) ?? "#8b5cf6" };
}

function feedbackFromRows(thread: Row, messages: Row[]): FeedbackThread {
  return {
    id: thread.id as string,
    userId: (thread.user_id as string) ?? undefined,
    userName: (thread.user_name as string) ?? "Гост",
    userEmail: (thread.user_email as string) ?? undefined,
    kind: (thread.kind as FeedbackThread["kind"]) ?? "feature",
    page: (thread.page as string) ?? undefined,
    status: (thread.status as FeedbackThread["status"]) ?? "open",
    messages: messages.map((m) => ({
      id: m.id as string,
      from: m.from as "user" | "owner",
      text: m.text as string,
      image: (m.image as string) ?? undefined,
      createdAt: m.created_at as string,
    })),
    createdAt: thread.created_at as string,
    updatedAt: thread.updated_at as string,
  };
}

// ---------- domain → row ----------
export function companyRow(c: Company): Row {
  return {
    id: c.id, name: c.name, industry: orNull(c.industry), contact_name: orNull(c.contactName),
    contact_email: orNull(c.contactEmail), website: orNull(c.website), notes: orNull(c.notes),
    created_at: c.createdAt,
  };
}

export function projectRow(p: Project): Row {
  return {
    id: p.id, name: p.name, description: orNull(p.description), company_id: orNull(p.companyId),
    status: p.status, color: p.color, owner_id: p.ownerId || null,
    start_date: orNull(p.startDate), end_date: orNull(p.endDate), created_at: p.createdAt,
  };
}

export function taskRow(t: Task): Row {
  return {
    id: t.id, project_id: t.projectId, title: t.title, description: orNull(t.description),
    status: t.status, column_id: orNull(t.columnId), priority: t.priority,
    assignee_id: orNull(t.assigneeId), due_date: orNull(t.dueDate), order: t.order,
    created_at: t.createdAt, completed_at: orNull(t.completedAt),
  };
}

export function timeLogRow(taskId: string, l: TimeLog): Row {
  return {
    id: l.id, task_id: taskId, user_id: l.userId, start_date: l.startDate,
    end_date: orNull(l.endDate), hours: orNull(l.hours), note: orNull(l.note),
  };
}

export function folderRow(f: Folder): Row {
  return {
    id: f.id, name: f.name, company_id: orNull(f.companyId), project_id: orNull(f.projectId),
    parent_id: orNull(f.parentId), created_at: f.createdAt,
  };
}

export function attachmentRow(a: Attachment): Row {
  return {
    id: a.id, company_id: orNull(a.companyId), project_id: orNull(a.projectId),
    task_id: orNull(a.taskId), folder_id: orNull(a.folderId), kind: a.kind, name: a.name,
    url: orNull(a.url), body: orNull(a.body), mime: orNull(a.mime), size: orNull(a.size),
    uploaded_by: a.uploadedBy || null, created_at: a.createdAt,
  };
}

export function agentRow(a: Agent): Row {
  return {
    id: a.id, name: a.name, description: orNull(a.description), instructions: orNull(a.instructions),
    model: a.model, color: a.color, skills: a.skills, company_id: orNull(a.companyId),
    project_id: orNull(a.projectId), status: a.status, created_at: a.createdAt,
  };
}

export function conversationRow(c: Conversation): Row {
  return {
    id: c.id, title: c.title, project_id: orNull(c.projectId), task_id: orNull(c.taskId),
    agent_id: orNull(c.agentId), created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

export function messageRow(convId: string, m: ChatMessage): Row {
  return {
    id: m.id, conversation_id: convId, role: m.role, content: m.content,
    action: orNull(m.action), created_at: m.createdAt,
  };
}

export function boardColumnRow(c: BoardColumn): Row {
  return { id: c.id, name: c.name, color: c.color };
}

// ---------- load everything ----------
export async function loadAll(db: DB): Promise<LoadedData> {
  const [
    profiles, companies, projects, members, tasks, timeLogs, folders,
    attachments, agents, conversations, messages, boardColumns, fThreads, fMessages,
  ] = await Promise.all([
    db.from("profiles").select("*"),
    db.from("companies").select("*").order("created_at", { ascending: false }),
    db.from("projects").select("*").order("created_at", { ascending: false }),
    db.from("project_members").select("*"),
    db.from("tasks").select("*"),
    db.from("time_logs").select("*"),
    db.from("folders").select("*"),
    db.from("attachments").select("*").order("created_at", { ascending: false }),
    db.from("agents").select("*").order("created_at", { ascending: false }),
    db.from("conversations").select("*").order("updated_at", { ascending: false }),
    db.from("messages").select("*").order("created_at", { ascending: true }),
    db.from("board_columns").select("*").order("order", { ascending: true }),
    db.from("feedback_threads").select("*").order("updated_at", { ascending: false }),
    db.from("feedback_messages").select("*").order("created_at", { ascending: true }),
  ]);

  const err = [profiles, companies, projects, members, tasks, timeLogs, folders, attachments, agents, conversations, messages, boardColumns, fThreads, fMessages].find((r) => r.error);
  if (err?.error) throw err.error;

  const membersByProject = groupBy((members.data ?? []) as Row[], (m) => m.project_id as string);
  const logsByTask = groupBy((timeLogs.data ?? []) as Row[], (l) => l.task_id as string);
  const msgsByConv = groupBy((messages.data ?? []) as Row[], (m) => m.conversation_id as string);
  const fMsgsByThread = groupBy((fMessages.data ?? []) as Row[], (m) => m.thread_id as string);

  return {
    users: ((profiles.data ?? []) as Row[]).map(userFromRow),
    companies: ((companies.data ?? []) as Row[]).map(companyFromRow),
    projects: ((projects.data ?? []) as Row[]).map((r) =>
      projectFromRow(r, (membersByProject[r.id as string] ?? []).map((m) => m.user_id as string))
    ),
    tasks: ((tasks.data ?? []) as Row[]).map((r) =>
      taskFromRow(r, (logsByTask[r.id as string] ?? []).map(timeLogFromRow))
    ),
    folders: ((folders.data ?? []) as Row[]).map(folderFromRow),
    attachments: ((attachments.data ?? []) as Row[]).map(attachmentFromRow),
    agents: ((agents.data ?? []) as Row[]).map(agentFromRow),
    conversations: ((conversations.data ?? []) as Row[]).map((r) =>
      conversationFromRow(r, (msgsByConv[r.id as string] ?? []).map(messageFromRow))
    ),
    boardColumns: ((boardColumns.data ?? []) as Row[]).map(boardColumnFromRow),
    feedback: ((fThreads.data ?? []) as Row[]).map((t) =>
      feedbackFromRows(t, fMsgsByThread[t.id as string] ?? [])
    ),
  };
}

// ---------- writes ----------
const log = (label: string) => (res: { error: unknown }) => {
  if (res?.error) console.error(`[supabase] ${label}:`, res.error);
  return res;
};

export const repo = {
  saveCompany: (db: DB, c: Company) => db.from("companies").upsert(companyRow(c)).then(log("saveCompany")),
  deleteCompany: (db: DB, id: string) => db.from("companies").delete().eq("id", id).then(log("deleteCompany")),

  async saveProject(db: DB, p: Project) {
    await db.from("projects").upsert(projectRow(p)).then(log("saveProject"));
    await db.from("project_members").delete().eq("project_id", p.id).then(log("clearMembers"));
    if (p.memberIds.length) {
      await db.from("project_members")
        .upsert(p.memberIds.map((uid) => ({ project_id: p.id, user_id: uid })))
        .then(log("saveMembers"));
    }
  },
  deleteProject: (db: DB, id: string) => db.from("projects").delete().eq("id", id).then(log("deleteProject")),

  saveTask: (db: DB, t: Task) => db.from("tasks").upsert(taskRow(t)).then(log("saveTask")),
  deleteTask: (db: DB, id: string) => db.from("tasks").delete().eq("id", id).then(log("deleteTask")),
  saveTimeLog: (db: DB, taskId: string, l: TimeLog) =>
    db.from("time_logs").upsert(timeLogRow(taskId, l)).then(log("saveTimeLog")),

  saveFolder: (db: DB, f: Folder) => db.from("folders").upsert(folderRow(f)).then(log("saveFolder")),
  deleteFolder: (db: DB, id: string) => db.from("folders").delete().eq("id", id).then(log("deleteFolder")),

  saveAttachment: (db: DB, a: Attachment) => db.from("attachments").upsert(attachmentRow(a)).then(log("saveAttachment")),
  deleteAttachment: (db: DB, id: string) => db.from("attachments").delete().eq("id", id).then(log("deleteAttachment")),

  saveAgent: (db: DB, a: Agent) => db.from("agents").upsert(agentRow(a)).then(log("saveAgent")),
  deleteAgent: (db: DB, id: string) => db.from("agents").delete().eq("id", id).then(log("deleteAgent")),

  saveBoardColumn: (db: DB, c: BoardColumn) => db.from("board_columns").upsert(boardColumnRow(c)).then(log("saveBoardColumn")),
  deleteBoardColumn: (db: DB, id: string) => db.from("board_columns").delete().eq("id", id).then(log("deleteBoardColumn")),

  saveConversation: (db: DB, c: Conversation) => db.from("conversations").upsert(conversationRow(c)).then(log("saveConversation")),
  deleteConversation: (db: DB, id: string) => db.from("conversations").delete().eq("id", id).then(log("deleteConversation")),
  insertMessage: (db: DB, convId: string, m: ChatMessage) =>
    db.from("messages").upsert(messageRow(convId, m)).then(log("insertMessage")),

  saveProfile: (db: DB, u: User) =>
    db.from("profiles").upsert({ id: u.id, name: u.name, email: u.email, role: u.role, color: u.color, title: orNull(u.title) }).then(log("saveProfile")),

  // feedback
  saveFeedbackThread: (db: DB, t: FeedbackThread) =>
    db.from("feedback_threads").upsert({
      id: t.id, user_id: orNull(t.userId), user_name: t.userName, user_email: orNull(t.userEmail),
      kind: t.kind, page: orNull(t.page), status: t.status, created_at: t.createdAt, updated_at: t.updatedAt,
    }).then(log("saveFeedbackThread")),
  insertFeedbackMessage: (db: DB, threadId: string, m: FeedbackThread["messages"][number]) =>
    db.from("feedback_messages").upsert({
      id: m.id, thread_id: threadId, from: m.from, text: m.text, image: orNull(m.image), created_at: m.createdAt,
    }).then(log("insertFeedbackMessage")),
  touchFeedbackThread: (db: DB, threadId: string, patch: { status?: string; updatedAt?: string }) =>
    db.from("feedback_threads").update({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.updatedAt ? { updated_at: patch.updatedAt } : {}),
    }).eq("id", threadId).then(log("touchFeedbackThread")),
  deleteFeedbackThread: (db: DB, id: string) => db.from("feedback_threads").delete().eq("id", id).then(log("deleteFeedbackThread")),

  // storage: upload a file/photo, return its public URL
  async uploadFile(db: DB, file: File, scope: string): Promise<{ url: string; path: string }> {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${scope}/${crypto.randomUUID()}-${safe}`;
    const { error } = await db.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = db.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
  },
};
