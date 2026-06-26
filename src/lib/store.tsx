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
import { uid } from "./utils";

const STORAGE_KEY = "atlas.data.v1";

function nowISO() {
  return new Date().toISOString();
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

  // auth (demo)
  login: (email: string) => boolean;
  signup: (name: string, email: string) => User;
  logout: () => void;
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
  const [data, setData] = useState<AppData>(() => buildSeed());
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // hydrate from localStorage on mount
  useEffect(() => {
    setData(load());
    setReady(true);
    hydrated.current = true;
  }, []);

  // persist
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data]);

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === data.currentUserId) ?? null,
    [data.users, data.currentUserId]
  );

  // ---- auth (demo) ----
  const login = useCallback((email: string) => {
    let ok = false;
    setData((d) => {
      const user = d.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return d;
      ok = true;
      return { ...d, currentUserId: user.id };
    });
    return ok;
  }, []);

  const signup = useCallback((name: string, email: string) => {
    const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];
    const user: User = {
      id: uid("u"),
      name,
      email,
      role: "member",
      color: colors[name.length % colors.length],
    };
    setData((d) => ({ ...d, users: [...d.users, user], currentUserId: user.id }));
    return user;
  }, []);

  const logout = useCallback(() => setData((d) => ({ ...d, currentUserId: null })), []);
  const switchUser = useCallback((id: ID) => setData((d) => ({ ...d, currentUserId: id })), []);

  const updateCurrentUser = useCallback((patch: Partial<User>) => {
    setData((d) => ({
      ...d,
      users: d.users.map((u) => (u.id === d.currentUserId ? { ...u, ...patch } : u)),
    }));
  }, []);

  // ---- companies ----
  const addCompany = useCallback((input: Partial<Company> & { name: string }) => {
    const company: Company = {
      id: uid("c"),
      createdAt: nowISO(),
      ...input,
    };
    setData((d) => ({ ...d, companies: [company, ...d.companies] }));
    return company;
  }, []);

  const updateCompany = useCallback((id: ID, patch: Partial<Company>) => {
    setData((d) => ({ ...d, companies: d.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteCompany = useCallback((id: ID) => {
    setData((d) => ({
      ...d,
      companies: d.companies.filter((c) => c.id !== id),
      projects: d.projects.map((p) => (p.companyId === id ? { ...p, companyId: undefined } : p)),
      agents: d.agents.map((a) => (a.companyId === id ? { ...a, companyId: undefined } : a)),
      // remove client-level files & folders (project-level ones stay with their project)
      folders: d.folders.filter((f) => !(f.companyId === id && !f.projectId)),
      attachments: d.attachments.filter((a) => !(a.companyId === id && !a.projectId)),
    }));
  }, []);

  // ---- projects ----
  const addProject = useCallback((input: Partial<Project> & { name: string }) => {
    const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];
    const project: Project = {
      id: uid("p"),
      status: "planning",
      color: colors[input.name.length % colors.length],
      ownerId: input.ownerId ?? "u_ivan",
      memberIds: input.memberIds ?? [],
      createdAt: nowISO(),
      ...input,
    };
    setData((d) => ({ ...d, projects: [project, ...d.projects] }));
    return project;
  }, []);

  const updateProject = useCallback((id: ID, patch: Partial<Project>) => {
    setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const deleteProject = useCallback((id: ID) => {
    setData((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== id),
      tasks: d.tasks.filter((t) => t.projectId !== id),
      attachments: d.attachments.filter((a) => a.projectId !== id),
      folders: d.folders.filter((f) => f.projectId !== id),
      agents: d.agents.map((a) => (a.projectId === id ? { ...a, projectId: undefined } : a)),
      conversations: d.conversations.filter((c) => c.projectId !== id),
    }));
  }, []);

  // ---- tasks ----
  const addTask = useCallback((input: Partial<Task> & { projectId: ID; title: string }) => {
    const task: Task = {
      id: uid("t"),
      status: "todo",
      priority: "medium",
      timeLogs: [],
      createdAt: nowISO(),
      order: Date.now(),
      ...input,
    };
    setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
    return task;
  }, []);

  const updateTask = useCallback((id: ID, patch: Partial<Task>) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        if (patch.status === "done" && t.status !== "done") next.completedAt = nowISO();
        if (patch.status && patch.status !== "done") next.completedAt = undefined;
        return next;
      }),
    }));
  }, []);

  const moveTask = useCallback((id: ID, status: TaskStatus) => {
    updateTask(id, { status, columnId: undefined });
  }, [updateTask]);

  const deleteTask = useCallback((id: ID) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.filter((t) => t.id !== id),
      attachments: d.attachments.filter((a) => a.taskId !== id),
    }));
  }, []);

  const addTimeLog = useCallback((taskId: ID, log: Partial<TimeLog> & { userId: ID; startDate: string }) => {
    const entry: TimeLog = { id: uid("tl"), ...log };
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, timeLogs: [...t.timeLogs, entry] } : t)),
    }));
  }, []);

  // ---- attachments ----
  const addAttachment = useCallback(
    (input: Partial<Attachment> & { name: string; kind: Attachment["kind"] }) => {
      const att: Attachment = {
        id: uid("a"),
        uploadedBy: "u_ivan",
        createdAt: nowISO(),
        ...input,
      };
      setData((d) => ({ ...d, attachments: [att, ...d.attachments] }));
      return att;
    },
    []
  );

  const deleteAttachment = useCallback((id: ID) => {
    setData((d) => ({ ...d, attachments: d.attachments.filter((a) => a.id !== id) }));
  }, []);

  // ---- folders (file system) ----
  const addFolder = useCallback((input: Partial<Folder> & { name: string }) => {
    const folder: Folder = { id: uid("f"), createdAt: nowISO(), ...input };
    setData((d) => ({ ...d, folders: [...d.folders, folder] }));
    return folder;
  }, []);

  const renameFolder = useCallback((id: ID, name: string) => {
    setData((d) => ({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
  }, []);

  const deleteFolder = useCallback((id: ID) => {
    setData((d) => {
      // collect the folder and any nested children
      const doomed = new Set<ID>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const f of d.folders) {
          if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
            doomed.add(f.id);
            grew = true;
          }
        }
      }
      return {
        ...d,
        folders: d.folders.filter((f) => !doomed.has(f.id)),
        // files inside a removed folder fall back to the folder's scope (folderId cleared)
        attachments: d.attachments.map((a) => (a.folderId && doomed.has(a.folderId) ? { ...a, folderId: undefined } : a)),
      };
    });
  }, []);

  // ---- agents ----
  const addAgent = useCallback((input: Partial<Agent> & { name: string }) => {
    const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];
    const agent: Agent = {
      id: uid("ag"),
      model: "Claude Opus 4.8",
      color: colors[input.name.length % colors.length],
      skills: [],
      status: "active",
      createdAt: nowISO(),
      ...input,
    };
    setData((d) => ({ ...d, agents: [agent, ...d.agents] }));
    return agent;
  }, []);

  const updateAgent = useCallback((id: ID, patch: Partial<Agent>) => {
    setData((d) => ({ ...d, agents: d.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);

  const deleteAgent = useCallback((id: ID) => {
    setData((d) => ({
      ...d,
      agents: d.agents.filter((a) => a.id !== id),
      conversations: d.conversations.map((c) => (c.agentId === id ? { ...c, agentId: undefined } : c)),
    }));
  }, []);

  // ---- custom board columns ----
  const addBoardColumn = useCallback((name: string) => {
    const colors = ["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#a855f7", "#ef4444"];
    const column: BoardColumn = { id: uid("col"), name, color: colors[name.length % colors.length] };
    setData((d) => ({ ...d, boardColumns: [...d.boardColumns, column] }));
    return column;
  }, []);

  const deleteBoardColumn = useCallback((id: ID) => {
    setData((d) => ({
      ...d,
      boardColumns: d.boardColumns.filter((c) => c.id !== id),
      // tasks fall back to their status column
      tasks: d.tasks.map((t) => (t.columnId === id ? { ...t, columnId: undefined } : t)),
    }));
  }, []);

  // ---- feedback ----
  // Each submission is its own item (so a feature request is a discrete to-do).
  const submitFeedback = useCallback((input: { text: string; image?: string; page?: string; kind?: FeedbackThread["kind"] }) => {
    setData((d) => {
      const user = d.users.find((u) => u.id === d.currentUserId);
      const msg: FeedbackMessage = { id: uid("fm"), from: "user", text: input.text, image: input.image, createdAt: nowISO() };
      const thread: FeedbackThread = {
        id: uid("fb"),
        userId: d.currentUserId ?? undefined,
        userName: user?.name ?? "Гост",
        userEmail: user?.email,
        kind: input.kind ?? "feature",
        page: input.page,
        status: "open",
        messages: [msg],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      return { ...d, feedback: [thread, ...d.feedback] };
    });
  }, []);

  const replyFeedback = useCallback((threadId: ID, input: { text: string; image?: string }) => {
    const msg: FeedbackMessage = { id: uid("fm"), from: "owner", text: input.text, image: input.image, createdAt: nowISO() };
    setData((d) => ({
      ...d,
      feedback: d.feedback.map((f) => (f.id === threadId ? { ...f, messages: [...f.messages, msg], updatedAt: nowISO() } : f)),
    }));
  }, []);

  const setFeedbackStatus = useCallback((threadId: ID, status: FeedbackThread["status"]) => {
    setData((d) => ({ ...d, feedback: d.feedback.map((f) => (f.id === threadId ? { ...f, status, updatedAt: nowISO() } : f)) }));
  }, []);

  const deleteFeedbackThread = useCallback((id: ID) => {
    setData((d) => ({ ...d, feedback: d.feedback.filter((f) => f.id !== id) }));
  }, []);

  // ---- conversations ----
  const addConversation = useCallback((input?: Partial<Conversation>) => {
    const conv: Conversation = {
      id: uid("conv"),
      title: input?.title ?? "Нов чат",
      projectId: input?.projectId,
      taskId: input?.taskId,
      agentId: input?.agentId,
      messages: input?.messages ?? [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    setData((d) => ({ ...d, conversations: [conv, ...d.conversations] }));
    return conv;
  }, []);

  const updateConversation = useCallback((id: ID, patch: Partial<Conversation>) => {
    setData((d) => ({
      ...d,
      conversations: d.conversations.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowISO() } : c)),
    }));
  }, []);

  const addMessage = useCallback((convId: ID, msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: ID }) => {
    const message: ChatMessage = { id: msg.id ?? uid("m"), createdAt: nowISO(), ...msg };
    setData((d) => ({
      ...d,
      conversations: d.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, message],
              updatedAt: nowISO(),
              title:
                c.messages.length === 0 && msg.role === "user"
                  ? msg.content.slice(0, 40)
                  : c.title,
            }
          : c
      ),
    }));
    return message;
  }, []);

  const deleteConversation = useCallback((id: ID) => {
    setData((d) => ({ ...d, conversations: d.conversations.filter((c) => c.id !== id) }));
  }, []);

  const resetDemo = useCallback(() => {
    const seed = buildSeed();
    setData(seed);
  }, []);

  const api: StoreApi = {
    data,
    ready,
    currentUser,
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
