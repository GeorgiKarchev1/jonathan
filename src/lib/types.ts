// ============================================================
// Atlas domain model
// Mirrors the Supabase schema in /supabase/schema.sql so the
// local store can be swapped for the cloud backend later.
// ============================================================

export type ID = string;

export type Role = "owner" | "admin" | "member";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  /** tailwind-ready accent color for the avatar */
  color: string;
  title?: string;
}

export interface Company {
  id: ID;
  name: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  website?: string;
  notes?: string;
  createdAt: string;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "done";

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: "Планиране", color: "var(--blue)" },
  active: { label: "Активен", color: "var(--green)" },
  on_hold: { label: "Изчакване", color: "var(--amber)" },
  done: { label: "Завършен", color: "var(--muted)" },
};

export interface Project {
  id: ID;
  name: string;
  description?: string;
  companyId?: ID;
  status: ProjectStatus;
  /** accent color used across cards/avatars */
  color: string;
  ownerId: ID;
  /** people who worked on the project */
  memberIds: ID[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export const TASK_STATUS: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "За правене", color: "var(--muted-2)" },
  in_progress: { label: "В процес", color: "var(--blue)" },
  review: { label: "Тестване", color: "var(--amber)" },
  done: { label: "Завършени", color: "var(--green)" },
};

/** Custom kanban columns the user can add via "Добави колона". */
export interface BoardColumn {
  id: ID;
  name: string;
  color: string;
}

export type Priority = "low" | "medium" | "high" | "urgent";

export const PRIORITY: Record<Priority, { label: string; color: string }> = {
  low: { label: "Нисък", color: "var(--muted)" },
  medium: { label: "Среден", color: "var(--blue)" },
  high: { label: "Висок", color: "var(--amber)" },
  urgent: { label: "Спешен", color: "var(--red)" },
};

export interface Task {
  id: ID;
  projectId: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  /** when set, places the task in a custom board column instead of its status column */
  columnId?: ID;
  priority: Priority;
  assigneeId?: ID;
  dueDate?: string;
  /** logged work periods — answers "who worked, when, how long" */
  timeLogs: TimeLog[];
  createdAt: string;
  completedAt?: string;
  order: number;
}

export interface TimeLog {
  id: ID;
  userId: ID;
  startDate: string;
  endDate?: string;
  hours?: number;
  note?: string;
}

export type AttachmentKind = "image" | "file" | "note" | "link";

export interface Attachment {
  id: ID;
  /** scope — a file may live at the client level, the project level, or both */
  companyId?: ID;
  projectId?: ID;
  taskId?: ID;
  /** optional folder it sits inside (file system) */
  folderId?: ID;
  kind: AttachmentKind;
  name: string;
  /** data URL (local) or storage URL (Supabase) for images/files */
  url?: string;
  /** free-form text for notes */
  body?: string;
  mime?: string;
  size?: number;
  uploadedBy: ID;
  createdAt: string;
}

// ---- File system: folders organise attachments per client / project ----
export interface Folder {
  id: ID;
  name: string;
  companyId?: ID;
  projectId?: ID;
  /** nested folders */
  parentId?: ID;
  createdAt: string;
}

// ---- AI agents the user can create & manage ----
export type AgentStatus = "active" | "paused";

export const AGENT_STATUS: Record<AgentStatus, { label: string; color: string }> = {
  active: { label: "Активен", color: "var(--green)" },
  paused: { label: "На пауза", color: "var(--muted)" },
};

/** Models offered when creating an agent (display-only until a real API is wired). */
export const AGENT_MODELS = [
  "Claude Opus 4.8",
  "Claude Sonnet 4.6",
  "Claude Haiku 4.5",
  "Claude Fable 5",
] as const;

export interface Agent {
  id: ID;
  name: string;
  /** short summary of what the agent does */
  description?: string;
  /** system prompt / persona that steers replies */
  instructions?: string;
  model: string;
  color: string;
  /** capabilities shown as chips, e.g. "Писане", "Анализ" */
  skills: string[];
  /** optional scope — restrict the agent to one client and/or project */
  companyId?: ID;
  projectId?: ID;
  status: AgentStatus;
  createdAt: string;
}

/** Ready-made personas to speed up agent creation. */
export const AGENT_TEMPLATES: { name: string; description: string; instructions: string; skills: string[]; color: string }[] = [
  {
    name: "Проектен мениджър",
    description: "Планира, приоритизира и следи задачите по проекта.",
    instructions: "Ти си опитен проектен мениджър. Разбивай целите на ясни стъпки, приоритизирай по спешност и предлагай следващи действия. Бъди кратък и конкретен.",
    skills: ["Планиране", "Приоритизиране", "Рискове"],
    color: "#8b5cf6",
  },
  {
    name: "Копирайтър",
    description: "Пише маркетингови текстове, имейли и съдържание.",
    instructions: "Ти си професионален копирайтър на български. Пиши ясно, убедително и съобразено с тона на марката. Предлагай по няколко варианта.",
    skills: ["Текстове", "Имейли", "Реклама"],
    color: "#ec4899",
  },
  {
    name: "Разработчик",
    description: "Помага с техническа реализация и код ревюта.",
    instructions: "Ти си старши софтуерен инженер. Давай практични решения, разбивай задачите технически и посочвай възможните проблеми. Обяснявай решенията накратко.",
    skills: ["Код", "Архитектура", "Ревю"],
    color: "#3b82f6",
  },
  {
    name: "Анализатор",
    description: "Обобщава, анализира данни и прави изводи.",
    instructions: "Ти си анализатор. Извличай ключовите факти, обобщавай и подкрепяй изводите с аргументи. Структурирай отговорите с точки.",
    skills: ["Анализ", "Обобщения", "Изводи"],
    color: "#22c55e",
  },
];

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: ID;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** optional structured action the assistant proposes/executed */
  action?: ChatAction;
}

export interface ChatAction {
  type: "execute_task" | "create_task" | "summary" | "plan";
  label: string;
  taskId?: ID;
  done?: boolean;
}

export interface Conversation {
  id: ID;
  title: string;
  /** chat can be scoped to a project and/or a specific task */
  projectId?: ID;
  taskId?: ID;
  /** the agent driving this conversation */
  agentId?: ID;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ---- User feedback / suggestions (floating widget → owner inbox) ----
export interface FeedbackMessage {
  id: ID;
  from: "user" | "owner";
  text: string;
  /** optional screenshot/image as data URL */
  image?: string;
  createdAt: string;
}

export type FeedbackStatus = "open" | "closed";

/** feature request (goes to the Features to-do) vs a general message */
export type FeedbackKind = "feature" | "message";

export interface FeedbackThread {
  id: ID;
  userId?: ID;
  userName: string;
  userEmail?: string;
  kind: FeedbackKind;
  /** page the first message was sent from */
  page?: string;
  status: FeedbackStatus;
  messages: FeedbackMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
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
  /** id of the currently signed-in user (demo auth) */
  currentUserId: ID | null;
}
