"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Agent,
  AppData,
  Attachment,
  BoardColumn,
  ChatMessage,
  Company,
  Conversation,
  FeedbackMessage,
  FeedbackThread,
  Folder,
  ID,
  Project,
  Task,
  TaskStatus,
  TimeLog,
  User,
} from "./types";
import { buildSeed } from "./seed";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { loadAll, repo } from "./supabase/repo";

const STORAGE_KEY = "atlas.data.v2";

function nowISO() {
  return new Date().toISOString();
}

/** Stable unique id — a real UUID so the same value works in the
 *  local store and as a Supabase primary key. */
function newId(): ID {
  return crypto.randomUUID();
}

/** Cloud mode starts empty; the signed-in user + team data load from Supabase. */
function emptyData(): AppData {
  return {
    users: [],
    companies: [],
    projects: [],
    tasks: [],
    attachments: [],
    folders: [],
    agents: [],
    boardColumns: [],
    conversations: [],
    feedback: [],
    currentUserId: null,
  };
}

/** Fill arrays added after a user's data was first saved, so older
 *  localStorage snapshots keep working without a reset. */
function normalize(data: AppData): AppData {
  const seed = buildSeed();
  return {
    ...data,
    users: data.users ?? seed.users,
    companies: data.companies ?? seed.companies,
    projects: data.projects ?? seed.projects,
    tasks: data.tasks ?? seed.tasks,
    attachments: data.attachments ?? seed.attachments,
    folders: data.folders ?? seed.folders,
    agents: data.agents ?? seed.agents,
    boardColumns: data.boardColumns ?? seed.boardColumns,
    conversations: data.conversations ?? seed.conversations,
    feedback: data.feedback ?? seed.feedback,
  };
}

function load(): AppData {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.users || !parsed.projects) return buildSeed();
    return normalize(parsed);
  } catch {
    return buildSeed();
  }
}

interface StoreApi {
  data: AppData;
  ready: boolean;
  currentUser: User | null;
  /** true when wired to Supabase (shared cloud data), false in local demo mode */
  cloud: boolean;

  // auth
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  switchUser: (id: ID) => void;
  updateCurrentUser: (patch: Partial<User>) => void;

  // companies
  addCompany: (input: Partial<Company> & { name: string }) => Company;
  updateCompany: (id: ID, patch: Partial<Company>) => void;
  deleteCompany: (id: ID) => void;

  // projects
  addProject: (input: Partial<Project> & { name: string }) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;

  // tasks
  addTask: (input: Partial<Task> & { projectId: ID; title: string }) => Task;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  moveTask: (id: ID, status: TaskStatus) => void;
  deleteTask: (id: ID) => void;
  addTimeLog: (taskId: ID, log: Partial<TimeLog> & { userId: ID; startDate: string }) => void;

  // attachments
  addAttachment: (input: Partial<Attachment> & { name: string; kind: Attachment["kind"] }) => Attachment;
  deleteAttachment: (id: ID) => void;
  /** upload a real file/photo to cloud storage (when configured), else returns a local data URL */
  uploadFile: (file: File, scope?: string) => Promise<string>;

  // folders (file system)
  addFolder: (input: Partial<Folder> & { name: string }) => Folder;
  renameFolder: (id: ID, name: string) => void;
  deleteFolder: (id: ID) => void;

  // agents
  addAgent: (input: Partial<Agent> & { name: string }) => Agent;
  updateAgent: (id: ID, patch: Partial<Agent>) => void;
  deleteAgent: (id: ID) => void;

  // custom board columns
  addBoardColumn: (name: string) => BoardColumn;
  deleteBoardColumn: (id: ID) => void;

  // feedback (user widget → owner inbox)
  submitFeedback: (input: { text: string; image?: string; page?: string; kind?: FeedbackThread["kind"] }) => void;
  replyFeedback: (threadId: ID, input: { text: string; image?: string }) => void;
  setFeedbackStatus: (threadId: ID, status: FeedbackThread["status"]) => void;
  deleteFeedbackThread: (id: ID) => void;

  // conversations
  addConversation: (input?: Partial<Conversation>) => Conversation;
  updateConversation: (id: ID, patch: Partial<Conversation>) => void;
  addMessage: (convId: ID, msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: ID }) => ChatMessage;
  deleteConversation: (id: ID) => void;

  resetDemo: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const cloud = !!supabase;

  const [data, setData] = useState<AppData>(() => (isSupabaseConfigured ? emptyData() : buildSeed()));
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // mirror latest state so mutation handlers can read it without re-creating callbacks
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /** fire-and-forget write to Supabase (cloud mode only); logs failures */
  const remote = useCallback(
    (fn: (db: NonNullable<typeof supabase>) => Promise<unknown> | unknown) => {
      if (!supabase) return;
      Promise.resolve(fn(supabase)).catch((e) => console.error("[store] remote write failed:", e));
    },
    [supabase]
  );

  // ---- initial load ----
  useEffect(() => {
    let active = true;

    if (!supabase) {
      // local demo mode
      setData(load());
      setReady(true);
      hydrated.current = true;
      return;
    }

    async function hydrateFromCloud(userId: string | null) {
      if (!userId) {
        if (active) {
          setData(emptyData());
          setReady(true);
        }
        return;
      }
      try {
        const loaded = await loadAll(supabase!);
        if (active) setData({ ...loaded, currentUserId: userId });
      } catch (e) {
        console.error("[store] cloud load failed:", e);
        if (active) setData((d) => ({ ...d, currentUserId: userId }));
      } finally {
        if (active) setReady(true);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateFromCloud(session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateFromCloud(session?.user.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // persist to localStorage in demo mode only
  useEffect(() => {
    if (!hydrated.current || cloud) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data, cloud]);

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === data.currentUserId) ?? null,
    [data.users, data.currentUserId]
  );

  const meId = useCallback(() => dataRef.current.currentUserId ?? "u_ivan", []);

  // ---- auth ----
  const login = useCallback(
    async (email: string, password?: string) => {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: password ?? "" });
        return !error;
      }
      // demo
      let ok = false;
      setData((d) => {
        const user = d.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return d;
        ok = true;
        return { ...d, currentUserId: user.id };
      });
      return ok;
    },
    [supabase]
  );

  const signup = useCallback(
    async (name: string, email: string, password?: string) => {
      if (supabase) {
        const { data: res, error } = await supabase.auth.signUp({
          email,
          password: password ?? "",
          options: { data: { name } },
        });
        if (error || !res.user) {
          console.error("[store] signup failed:", error);
          return null;
        }
        return { id: res.user.id, name, email, role: "member", color: "#8b5cf6" } as User;
      }
      // demo
      const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];
      const user: User = { id: newId(), name, email, role: "member", color: colors[name.length % colors.length] };
      setData((d) => ({ ...d, users: [...d.users, user], currentUserId: user.id }));
      return user;
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setData((d) => ({ ...d, currentUserId: null }));
  }, [supabase]);

  const switchUser = useCallback((id: ID) => setData((d) => ({ ...d, currentUserId: id })), []);

  const updateCurrentUser = useCallback(
    (patch: Partial<User>) => {
      setData((d) => {
        const users = d.users.map((u) => (u.id === d.currentUserId ? { ...u, ...patch } : u));
        const me = users.find((u) => u.id === d.currentUserId);
        if (me) remote((db) => repo.saveProfile(db, me));
        return { ...d, users };
      });
    },
    [remote]
  );

  // ---- companies ----
  const addCompany = useCallback(
    (input: Partial<Company> & { name: string }) => {
      const company: Company = { id: newId(), createdAt: nowISO(), ...input };
      setData((d) => ({ ...d, companies: [company, ...d.companies] }));
      remote((db) => repo.saveCompany(db, company));
      return company;
    },
    [remote]
  );

  const updateCompany = useCallback(
    (id: ID, patch: Partial<Company>) => {
      const updated = { ...dataRef.current.companies.find((c) => c.id === id), ...patch } as Company;
      setData((d) => ({ ...d, companies: d.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      if (updated.id) remote((db) => repo.saveCompany(db, updated));
    },
    [remote]
  );

  const deleteCompany = useCallback(
    (id: ID) => {
      setData((d) => ({
        ...d,
        companies: d.companies.filter((c) => c.id !== id),
        projects: d.projects.map((p) => (p.companyId === id ? { ...p, companyId: undefined } : p)),
        agents: d.agents.map((a) => (a.companyId === id ? { ...a, companyId: undefined } : a)),
        folders: d.folders.filter((f) => !(f.companyId === id && !f.projectId)),
        attachments: d.attachments.filter((a) => !(a.companyId === id && !a.projectId)),
      }));
      remote((db) => repo.deleteCompany(db, id));
    },
    [remote]
  );

  // ---- projects ----
  const addProject = useCallback(
    (input: Partial<Project> & { name: string }) => {
      const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];
      const project: Project = {
        id: newId(),
        status: "planning",
        color: colors[input.name.length % colors.length],
        ownerId: input.ownerId ?? meId(),
        memberIds: input.memberIds ?? [],
        createdAt: nowISO(),
        ...input,
      };
      setData((d) => ({ ...d, projects: [project, ...d.projects] }));
      remote((db) => repo.saveProject(db, project));
      return project;
    },
    [remote, meId]
  );

  const updateProject = useCallback(
    (id: ID, patch: Partial<Project>) => {
      const updated = { ...dataRef.current.projects.find((p) => p.id === id), ...patch } as Project;
      setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      if (updated.id) remote((db) => repo.saveProject(db, updated));
    },
    [remote]
  );

  const deleteProject = useCallback(
    (id: ID) => {
      setData((d) => ({
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        tasks: d.tasks.filter((t) => t.projectId !== id),
        attachments: d.attachments.filter((a) => a.projectId !== id),
        folders: d.folders.filter((f) => f.projectId !== id),
        agents: d.agents.map((a) => (a.projectId === id ? { ...a, projectId: undefined } : a)),
        conversations: d.conversations.filter((c) => c.projectId !== id),
      }));
      remote((db) => repo.deleteProject(db, id));
    },
    [remote]
  );

  // ---- tasks ----
  const addTask = useCallback(
    (input: Partial<Task> & { projectId: ID; title: string }) => {
      const task: Task = {
        id: newId(),
        status: "todo",
        priority: "medium",
        timeLogs: [],
        createdAt: nowISO(),
        order: Date.now(),
        ...input,
      };
      setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
      remote((db) => repo.saveTask(db, task));
      return task;
    },
    [remote]
  );

  const updateTask = useCallback(
    (id: ID, patch: Partial<Task>) => {
      const prev = dataRef.current.tasks.find((t) => t.id === id);
      if (!prev) return;
      const next: Task = { ...prev, ...patch };
      if (patch.status === "done" && prev.status !== "done") next.completedAt = nowISO();
      if (patch.status && patch.status !== "done") next.completedAt = undefined;
      setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? next : t)) }));
      remote((db) => repo.saveTask(db, next));
    },
    [remote]
  );

  const moveTask = useCallback(
    (id: ID, status: TaskStatus) => {
      updateTask(id, { status, columnId: undefined });
    },
    [updateTask]
  );

  const deleteTask = useCallback(
    (id: ID) => {
      setData((d) => ({
        ...d,
        tasks: d.tasks.filter((t) => t.id !== id),
        attachments: d.attachments.filter((a) => a.taskId !== id),
      }));
      remote((db) => repo.deleteTask(db, id));
    },
    [remote]
  );

  const addTimeLog = useCallback(
    (taskId: ID, log: Partial<TimeLog> & { userId: ID; startDate: string }) => {
      const entry: TimeLog = { id: newId(), ...log };
      setData((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, timeLogs: [...t.timeLogs, entry] } : t)),
      }));
      remote((db) => repo.saveTimeLog(db, taskId, entry));
    },
    [remote]
  );

  // ---- attachments ----
  const addAttachment = useCallback(
    (input: Partial<Attachment> & { name: string; kind: Attachment["kind"] }) => {
      const att: Attachment = { id: newId(), uploadedBy: meId(), createdAt: nowISO(), ...input };
      setData((d) => ({ ...d, attachments: [att, ...d.attachments] }));
      remote((db) => repo.saveAttachment(db, att));
      return att;
    },
    [remote, meId]
  );

  const deleteAttachment = useCallback(
    (id: ID) => {
      setData((d) => ({ ...d, attachments: d.attachments.filter((a) => a.id !== id) }));
      remote((db) => repo.deleteAttachment(db, id));
    },
    [remote]
  );

  const uploadFile = useCallback(
    async (file: File, scope = "misc") => {
      if (supabase) {
        const { url } = await repo.uploadFile(supabase, file, scope);
        return url;
      }
      // demo: base64 data URL
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
    },
    [supabase]
  );

  // ---- folders (file system) ----
  const addFolder = useCallback(
    (input: Partial<Folder> & { name: string }) => {
      const folder: Folder = { id: newId(), createdAt: nowISO(), ...input };
      setData((d) => ({ ...d, folders: [...d.folders, folder] }));
      remote((db) => repo.saveFolder(db, folder));
      return folder;
    },
    [remote]
  );

  const renameFolder = useCallback(
    (id: ID, name: string) => {
      const updated = { ...dataRef.current.folders.find((f) => f.id === id), name } as Folder;
      setData((d) => ({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
      if (updated.id) remote((db) => repo.saveFolder(db, updated));
    },
    [remote]
  );

  const deleteFolder = useCallback(
    (id: ID) => {
      const doomed = new Set<ID>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const f of dataRef.current.folders) {
          if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
            doomed.add(f.id);
            grew = true;
          }
        }
      }
      setData((d) => ({
        ...d,
        folders: d.folders.filter((f) => !doomed.has(f.id)),
        attachments: d.attachments.map((a) => (a.folderId && doomed.has(a.folderId) ? { ...a, folderId: undefined } : a)),
      }));
      // delete the whole subtree (DB FK clears attachment.folder_id automatically)
      doomed.forEach((fid) => remote((db) => repo.deleteFolder(db, fid)));
    },
    [remote]
  );

  // ---- agents ----
  const addAgent = useCallback(
    (input: Partial<Agent> & { name: string }) => {
      const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];
      const agent: Agent = {
        id: newId(),
        model: "Claude Opus 4.8",
        color: colors[input.name.length % colors.length],
        skills: [],
        status: "active",
        createdAt: nowISO(),
        ...input,
      };
      setData((d) => ({ ...d, agents: [agent, ...d.agents] }));
      remote((db) => repo.saveAgent(db, agent));
      return agent;
    },
    [remote]
  );

  const updateAgent = useCallback(
    (id: ID, patch: Partial<Agent>) => {
      const updated = { ...dataRef.current.agents.find((a) => a.id === id), ...patch } as Agent;
      setData((d) => ({ ...d, agents: d.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      if (updated.id) remote((db) => repo.saveAgent(db, updated));
    },
    [remote]
  );

  const deleteAgent = useCallback(
    (id: ID) => {
      setData((d) => ({
        ...d,
        agents: d.agents.filter((a) => a.id !== id),
        conversations: d.conversations.map((c) => (c.agentId === id ? { ...c, agentId: undefined } : c)),
      }));
      remote((db) => repo.deleteAgent(db, id));
    },
    [remote]
  );

  // ---- custom board columns ----
  const addBoardColumn = useCallback(
    (name: string) => {
      const colors = ["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#a855f7", "#ef4444"];
      const column: BoardColumn = { id: newId(), name, color: colors[name.length % colors.length] };
      setData((d) => ({ ...d, boardColumns: [...d.boardColumns, column] }));
      remote((db) => repo.saveBoardColumn(db, column));
      return column;
    },
    [remote]
  );

  const deleteBoardColumn = useCallback(
    (id: ID) => {
      setData((d) => ({
        ...d,
        boardColumns: d.boardColumns.filter((c) => c.id !== id),
        tasks: d.tasks.map((t) => (t.columnId === id ? { ...t, columnId: undefined } : t)),
      }));
      remote((db) => repo.deleteBoardColumn(db, id));
    },
    [remote]
  );

  // ---- feedback ----
  const submitFeedback = useCallback(
    (input: { text: string; image?: string; page?: string; kind?: FeedbackThread["kind"] }) => {
      const d0 = dataRef.current;
      const user = d0.users.find((u) => u.id === d0.currentUserId);
      const msg: FeedbackMessage = { id: newId(), from: "user", text: input.text, image: input.image, createdAt: nowISO() };
      const thread: FeedbackThread = {
        id: newId(),
        userId: d0.currentUserId ?? undefined,
        userName: user?.name ?? "Гост",
        userEmail: user?.email,
        kind: input.kind ?? "feature",
        page: input.page,
        status: "open",
        messages: [msg],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      setData((d) => ({ ...d, feedback: [thread, ...d.feedback] }));
      remote(async (db) => {
        await repo.saveFeedbackThread(db, thread);
        await repo.insertFeedbackMessage(db, thread.id, msg);
      });
    },
    [remote]
  );

  const replyFeedback = useCallback(
    (threadId: ID, input: { text: string; image?: string }) => {
      const msg: FeedbackMessage = { id: newId(), from: "owner", text: input.text, image: input.image, createdAt: nowISO() };
      const ts = nowISO();
      setData((d) => ({
        ...d,
        feedback: d.feedback.map((f) => (f.id === threadId ? { ...f, messages: [...f.messages, msg], updatedAt: ts } : f)),
      }));
      remote(async (db) => {
        await repo.insertFeedbackMessage(db, threadId, msg);
        await repo.touchFeedbackThread(db, threadId, { updatedAt: ts });
      });
    },
    [remote]
  );

  const setFeedbackStatus = useCallback(
    (threadId: ID, status: FeedbackThread["status"]) => {
      const ts = nowISO();
      setData((d) => ({ ...d, feedback: d.feedback.map((f) => (f.id === threadId ? { ...f, status, updatedAt: ts } : f)) }));
      remote((db) => repo.touchFeedbackThread(db, threadId, { status, updatedAt: ts }));
    },
    [remote]
  );

  const deleteFeedbackThread = useCallback(
    (id: ID) => {
      setData((d) => ({ ...d, feedback: d.feedback.filter((f) => f.id !== id) }));
      remote((db) => repo.deleteFeedbackThread(db, id));
    },
    [remote]
  );

  // ---- conversations ----
  const addConversation = useCallback(
    (input?: Partial<Conversation>) => {
      const conv: Conversation = {
        id: newId(),
        title: input?.title ?? "Нов чат",
        projectId: input?.projectId,
        taskId: input?.taskId,
        agentId: input?.agentId,
        messages: input?.messages ?? [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      setData((d) => ({ ...d, conversations: [conv, ...d.conversations] }));
      remote((db) => repo.saveConversation(db, conv));
      return conv;
    },
    [remote]
  );

  const updateConversation = useCallback(
    (id: ID, patch: Partial<Conversation>) => {
      const updated = { ...dataRef.current.conversations.find((c) => c.id === id), ...patch, updatedAt: nowISO() } as Conversation;
      setData((d) => ({
        ...d,
        conversations: d.conversations.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: updated.updatedAt } : c)),
      }));
      if (updated.id) remote((db) => repo.saveConversation(db, updated));
    },
    [remote]
  );

  const addMessage = useCallback(
    (convId: ID, msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: ID }) => {
      const message: ChatMessage = { id: msg.id ?? newId(), createdAt: nowISO(), ...msg };
      const conv = dataRef.current.conversations.find((c) => c.id === convId);
      const newTitle =
        conv && conv.messages.length === 0 && msg.role === "user" ? msg.content.slice(0, 40) : conv?.title;
      const ts = nowISO();
      setData((d) => ({
        ...d,
        conversations: d.conversations.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, message], updatedAt: ts, title: newTitle ?? c.title }
            : c
        ),
      }));
      remote(async (db) => {
        await repo.insertMessage(db, convId, message);
        if (conv) await repo.saveConversation(db, { ...conv, title: newTitle ?? conv.title, updatedAt: ts, messages: [] });
      });
      return message;
    },
    [remote]
  );

  const deleteConversation = useCallback(
    (id: ID) => {
      setData((d) => ({ ...d, conversations: d.conversations.filter((c) => c.id !== id) }));
      remote((db) => repo.deleteConversation(db, id));
    },
    [remote]
  );

  const resetDemo = useCallback(() => {
    if (cloud) return; // cloud data is the source of truth; nothing to reset
    setData(buildSeed());
  }, [cloud]);

  const api: StoreApi = {
    data,
    ready,
    currentUser,
    cloud,
    login,
    signup,
    logout,
    switchUser,
    updateCurrentUser,
    addCompany,
    updateCompany,
    deleteCompany,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    moveTask,
    deleteTask,
    addTimeLog,
    addAttachment,
    deleteAttachment,
    uploadFile,
    addFolder,
    renameFolder,
    deleteFolder,
    addAgent,
    updateAgent,
    deleteAgent,
    addBoardColumn,
    deleteBoardColumn,
    submitFeedback,
    replyFeedback,
    setFeedbackStatus,
    deleteFeedbackThread,
    addConversation,
    updateConversation,
    addMessage,
    deleteConversation,
    resetDemo,
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ---- convenience selectors ----
export function useProject(id?: ID) {
  const { data } = useStore();
  return useMemo(() => data.projects.find((p) => p.id === id) ?? null, [data.projects, id]);
}

export function useTasksForProject(projectId?: ID) {
  const { data } = useStore();
  return useMemo(
    () => data.tasks.filter((t) => t.projectId === projectId).sort((a, b) => a.order - b.order),
    [data.tasks, projectId]
  );
}

export function userById(data: AppData, id?: ID): User | undefined {
  return data.users.find((u) => u.id === id);
}

export function companyById(data: AppData, id?: ID): Company | undefined {
  return data.companies.find((c) => c.id === id);
}

export function agentById(data: AppData, id?: ID): Agent | undefined {
  return data.agents.find((a) => a.id === id);
}
