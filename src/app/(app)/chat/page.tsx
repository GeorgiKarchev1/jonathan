"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { generateReply, quickPrompts } from "@/lib/ai";
import { Avatar, Button } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { ChatAction, Conversation } from "@/lib/types";
import {
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Play,
  CheckCircle2,
  FileText,
  X,
  PanelLeft,
  Robot,
  Pencil,
} from "@/components/icons";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--muted)]">Зареждане…</div>}>
      <ChatInner />
    </Suspense>
  );
}

// ─── helpers ────────────────────────────────────────────────────
function useMediaQuery(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    setM(mq.matches);
    const fn = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [q]);
  return m;
}

function randomGradient() {
  const colors = ["#8b5cf6", "#3b82f6", "#ec4899", "#22c55e", "#f59e0b", "#06b6d4"];
  const a = colors[Math.floor(Math.random() * colors.length)];
  let b = colors[Math.floor(Math.random() * colors.length)];
  while (b === a) b = colors[Math.floor(Math.random() * colors.length)];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// ─── main component ─────────────────────────────────────────────
function ChatInner() {
  const { data, addConversation, deleteConversation } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [listOpen, setListOpen] = useState(false);

  const conversations = useMemo(
    () => [...data.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.conversations],
  );

  const rawPanes = params.get("panes");
  const single = params.get("c");
  const execute = params.get("execute") === "1";
  const requested = rawPanes ? rawPanes.split(",") : single ? [single] : [];
  const panes = requested.filter((id) => data.conversations.some((c) => c.id === id));

  function setPanes(ids: string[]) {
    router.replace(ids.length ? `/chat?panes=${ids.join(",")}` : "/chat");
  }

  useEffect(() => {
    if (panes.length === 0 && conversations.length > 0 && !rawPanes && !single) {
      router.replace(`/chat?panes=${conversations[0].id}`);
    }
  }, [panes.length, conversations.length, rawPanes, single, router]);

  function openPane(id: string) {
    if (!panes.includes(id)) setPanes([...panes, id]);
    if (isMobile) setListOpen(false);
  }
  function closePane(id: string) {
    setPanes(panes.filter((p) => p !== id));
  }
  function newChat() {
    const conv = addConversation({ messages: [] });
    setPanes([...panes, conv.id]);
    if (isMobile) setListOpen(false);
  }

  return (
    <div className="flex h-full">
      {/* ── conversation sidebar ── */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform md:static md:translate-x-0",
          listOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <span className="flex items-center gap-2 font-semibold">
            <MessageSquare size={17} className="text-[var(--muted)]" />
            Чатове
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={newChat}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Нов чат"
            >
              <Plus size={18} />
            </button>
            <button
              className="md:hidden text-[var(--muted)]"
              onClick={() => setListOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* list */}
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="p-3 text-sm text-[var(--muted-2)]">Няма чатове още.</p>
          )}
          {conversations.map((c) => {
            const p = data.projects.find((x) => x.id === c.projectId);
            const ag = data.agents.find((a) => a.id === c.agentId);
            const open = panes.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => openPane(c.id)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                  open ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: ag?.color ?? "#fff", color: ag?.color ? "#fff" : "#000" }}
                >
                  {ag ? <Robot size={14} /> : <Sparkles size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ag ? ag.name : c.title}</p>
                  <p className="truncate text-xs text-[var(--muted-2)]">
                    {p ? p.name : "Общ"} · {relativeTime(c.updatedAt)}
                  </p>
                </div>
                {open && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                  />
                )}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="shrink-0 text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* mobile backdrop */}
      {listOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setListOpen(false)} />
      )}

      {/* ── panes ── */}
      {panes.length === 0 ? (
        <EmptyState
          onNewChat={newChat}
          onOpenList={() => setListOpen(true)}
        />
      ) : (
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {panes.map((id) => (
            <ChatPane
              key={id}
              convId={id}
              autoExecute={execute && id === single}
              flex={panes.length === 1}
              canClose={panes.length > 1}
              onClose={() => closePane(id)}
              onOpenList={() => setListOpen(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────
function EmptyState({
  onNewChat,
  onOpenList,
}: {
  onNewChat: () => void;
  onOpenList: () => void;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* aurora bg */}
      <div className="aurora">
        <div className="aurora-blob drift-a h-64 w-64" style={{ background: "rgba(139,92,246,0.25)", top: "10%", left: "20%" }} />
        <div className="aurora-blob drift-b h-80 w-80" style={{ background: "rgba(59,130,246,0.15)", top: "40%", right: "15%" }} />
        <div className="aurora-blob drift-c h-56 w-56" style={{ background: "rgba(236,72,153,0.12)", bottom: "10%", left: "35%" }} />
      </div>

      <button
        className="absolute left-4 top-4 md:hidden text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
        onClick={onOpenList}
      >
        <PanelLeft size={20} />
      </button>

      <div className="relative z-10 flex flex-col items-center">
        {/* logo ring */}
        <div className="gradient-border mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
          <span className="flex h-full w-full items-center justify-center rounded-2xl bg-white text-black">
            <Sparkles size={36} />
          </span>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">Justin</h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)] leading-relaxed">
          Твоят AI асистент за проекти и задачи.
          <br />
          Свързан директно с данните ти.
        </p>

        <Button variant="primary" size="lg" className="mt-8 shine" onClick={onNewChat}>
          <Plus size={18} weight="bold" /> Нов разговор
        </Button>
      </div>
    </div>
  );
}

// ─── Chat pane ──────────────────────────────────────────────────
function ChatPane({
  convId,
  autoExecute,
  flex,
  canClose,
  onClose,
  onOpenList,
}: {
  convId: string;
  autoExecute: boolean;
  flex: boolean;
  canClose: boolean;
  onClose: () => void;
  onOpenList: () => void;
}) {
  const { data, currentUser, addMessage, updateConversation, updateTask } = useStore();
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const executedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = data.conversations.find((c) => c.id === convId) ?? null;
  const project = data.projects.find((p) => p.id === active?.projectId) ?? null;
  const task = data.tasks.find((t) => t.id === active?.taskId) ?? null;
  const agent = data.agents.find((a) => a.id === active?.agentId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, typing]);

  // auto-focus input
  useEffect(() => {
    if (!typing) inputRef.current?.focus();
  }, [typing]);

  function reply(text: string, conv: Conversation) {
    setTyping(true);
    const proj = data.projects.find((p) => p.id === conv.projectId) ?? null;
    const tsk = data.tasks.find((t) => t.id === conv.taskId) ?? null;
    const ag = data.agents.find((a) => a.id === conv.agentId) ?? null;
    const result = generateReply(text, {
      agent: ag,
      project: proj,
      task: tsk,
      userName: currentUser?.name,
    });
    window.setTimeout(() => {
      addMessage(conv.id, {
        role: "assistant",
        content: result.content,
        action: result.action,
      });
      if (result.action?.type === "execute_task" && result.action.taskId) {
        updateTask(result.action.taskId, { status: "in_progress" });
      }
      setTyping(false);
    }, 600 + Math.min(text.length * 8, 900));
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || typing || !active) return;
    addMessage(active.id, { role: "user", content });
    setInput("");
    reply(content, active);
  }

  // auto-execute
  useEffect(() => {
    if (autoExecute && active && !executedRef.current && active.messages.length === 0 && !typing) {
      executedRef.current = true;
      const txt = "Изпълни тази задача";
      addMessage(active.id, { role: "user", content: txt });
      reply(txt, active);
    }
  }, [autoExecute, active, typing]);

  if (!active) return null;
  const prompts = quickPrompts({ project, task });
  const lastMsg = active.messages[active.messages.length - 1];

  function handleSend(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-w-[340px] flex-col border-r border-[var(--border)]",
        flex ? "flex-1" : "w-[420px] shrink-0",
      )}
    >
      {/* ── header ── */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
        <button className="md:hidden text-[var(--muted)]" onClick={onOpenList}>
          <PanelLeft size={20} />
        </button>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{
            background: agent?.color ?? "linear-gradient(135deg, #8b5cf6, #3b82f6)",
          }}
        >
          {agent ? <Robot size={17} /> : <Sparkles size={17} weight="fill" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{agent ? agent.name : active.title}</p>
          <p className="truncate text-xs text-[var(--muted-2)]">
            {typing ? "пише…" : project ? project.name : "AI Асистент"}
            {task && ` · ${task.title}`}
          </p>
        </div>

        {canClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* ── messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {active.messages.length === 0 ? (
          <EmptyChat
            userName={currentUser?.name?.split(" ")[0]}
            agentName={agent?.name}
            prompts={prompts}
            onPick={send}
          />
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            {active.messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                action={m.action}
                userColor={currentUser?.color}
                userName={currentUser?.name}
                agentColor={agent?.color}
                agentName={agent?.name}
                isLast={i === active.messages.length - 1}
                onExecuteDone={(taskId) => updateTask(taskId, { status: "done" })}
              />
            ))}
            {typing && <TypingIndicator agentColor={agent?.color} />}
          </div>
        )}
      </div>

      {/* ── composer ── */}
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {/* quick prompts */}
          {active.messages.length > 0 && prompts.length > 0 && !typing && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {prompts.slice(0, 3).map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="group relative truncate rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--foreground)] hover:shadow-[0_0_12px_rgba(139,92,246,0.2)] cursor-pointer overflow-hidden"
                >
                  <span className="relative z-10">{p}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-2 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={agent ? `Попитай ${agent.name}…` : "Напиши съобщение…"}
              rows={1}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--muted-2)]"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-all hover:bg-white/90 hover:shadow-[0_0_16px_rgba(255,255,255,0.15)] disabled:opacity-30 disabled:hover:shadow-none cursor-pointer disabled:cursor-not-allowed"
              aria-label="Изпрати"
            >
              <Send size={16} weight="fill" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────
function MessageBubble({
  role,
  content,
  action,
  userColor,
  userName,
  agentColor,
  agentName,
  isLast,
  onExecuteDone,
}: {
  role: "user" | "assistant";
  content: string;
  action?: ChatAction;
  userColor?: string;
  userName?: string;
  agentColor?: string;
  agentName?: string;
  isLast: boolean;
  onExecuteDone: (taskId: string) => void;
}) {
  const [done, setDone] = useState(action?.done ?? false);

  if (role === "user") {
    return (
      <div
        className={cn(
          "flex justify-end gap-3",
          isLast ? "animate-in" : "",
        )}
        style={{ animationDelay: "0.05s" }}
      >
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
          {content}
        </div>
        <Avatar name={userName ?? "?"} color={userColor} size={30} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isLast ? "animate-in" : "",
      )}
      style={{ animationDelay: "0.12s" }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
        style={{
          background: agentColor ?? "linear-gradient(135deg, #8b5cf6, #3b82f6)",
        }}
      >
        {agentColor ? <Robot size={15} /> : <Sparkles size={15} weight="fill" />}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {/* name + model */}
        {agentName && (
          <span className="text-xs font-medium text-[var(--muted)]">{agentName}</span>
        )}

        <div className="prose-sm whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
          {content}
        </div>

        {/* action card */}
        {action && (
          <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 pl-3 transition-all hover:border-[var(--border-strong)]">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              {action.type === "execute_task" ? (
                <Play size={13} className="text-[var(--accent)]" />
              ) : (
                <FileText size={13} className="text-[var(--accent)]" />
              )}
              {action.label}
            </span>
            {action.type === "execute_task" && action.taskId && (
              done ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[rgba(34,197,94,0.14)] px-2 py-1 text-xs text-[var(--green)]">
                  <CheckCircle2 size={13} weight="fill" /> Готово
                </span>
              ) : (
                <button
                  onClick={() => {
                    setDone(true);
                    onExecuteDone(action.taskId!);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black transition-all hover:bg-white/90 hover:shadow-[0_0_12px_rgba(255,255,255,0.12)] cursor-pointer"
                >
                  <CheckCircle2 size={13} /> Маркирай готово
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing ─────────────────────────────────────────────────────
function TypingIndicator({ agentColor }: { agentColor?: string }) {
  return (
    <div className="flex gap-3 animate-in">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
        style={{
          background: agentColor ?? "linear-gradient(135deg, #8b5cf6, #3b82f6)",
        }}
      >
        <Sparkles size={14} weight="fill" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl bg-[var(--surface-2)] px-4 py-3.5">
        <span className="typing-dot h-2 w-2 rounded-full" style={{ background: agentColor ?? "var(--accent)" }} />
        <span className="typing-dot h-2 w-2 rounded-full" style={{ background: agentColor ?? "var(--accent)" }} />
        <span className="typing-dot h-2 w-2 rounded-full" style={{ background: agentColor ?? "var(--accent)" }} />
      </div>
    </div>
  );
}

// ─── Empty chat ─────────────────────────────────────────────────
function EmptyChat({
  userName,
  agentName,
  prompts,
  onPick,
}: {
  userName?: string;
  agentName?: string;
  prompts: string[];
  onPick: (s: string) => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* aurora bg */}
      <div className="aurora">
        <div className="aurora-blob drift-a h-48 w-48" style={{ background: "rgba(139,92,246,0.2)", top: "15%", left: "25%" }} />
        <div className="aurora-blob drift-b h-56 w-56" style={{ background: "rgba(59,130,246,0.12)", top: "45%", right: "20%" }} />
      </div>

      <div className="relative z-10">
        <div className="gradient-border mb-5 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
          <span className="flex h-full w-full items-center justify-center rounded-2xl bg-white text-black">
            <Sparkles size={24} />
          </span>
        </div>

        <h2 className="text-lg font-semibold tracking-tight">
          {agentName ? `Чат с ${agentName}` : `С какво да помогна${userName ? `, ${userName}` : ""}?`}
        </h2>

        <div className="mt-6 grid w-full max-w-sm gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-left text-sm transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:shadow-[0_0_16px_rgba(139,92,246,0.1)] cursor-pointer overflow-hidden"
            >
              <span className="relative z-10">{p}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
