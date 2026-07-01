"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar, Button } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import {
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  X,
  PanelLeft,
  Play,
  CheckCircle2,
  FileText,
} from "@/components/icons";

export default function ChatPage() {
  return <ChatView />;
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

// ─── simple ID ──────────────────────────────────────────────────
let _i = 0;
function uid() {
  return `msg_${Date.now()}_${++_i}`;
}

// ─── API call to the real Justin gateway ────────────────────────
async function askJustin(
  messages: { role: string; content: string }[],
  _onChunk: (text: string) => void,
  onTool: (tool: string) => void,
): Promise<string> {
  onTool("🤔 Изпращам заявка…");

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: messages[messages.length - 1]?.content ?? "",
      conversation_id: `web:${Date.now()}`,
      user_name: "Justin",
    }),
    signal: AbortSignal.timeout(290_000),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.reply || "(няма отговор)";
}

// ─── Main chat view ─────────────────────────────────────────────
function ChatView() {
  const { data, currentUser, addConversation, addMessage, updateConversation, deleteConversation } = useStore();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [toolStatus, setToolStatus] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load active conversation
  const active = activeId ? data.conversations.find((c) => c.id === activeId) ?? null : null;

  // When active conversation changes, load its messages
  useEffect(() => {
    if (active) {
      setMessages(active.messages);
      setTyping(false);
      setToolStatus("");
    } else {
      setMessages([]);
    }
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Focus input when not typing
  useEffect(() => {
    if (!typing) inputRef.current?.focus();
  }, [typing]);

  // Sort conversations newest first
  const conversations = [...data.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // If no active conversation, auto-select the first one
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations.length]);

  function openConv(id: string) {
    setActiveId(id);
    if (isMobile) setSidebarOpen(false);
  }

  function newConv() {
    const conv = addConversation({ messages: [], agentId: undefined });
    setActiveId(conv.id);
    setMessages([]);
    setTyping(false);
    setToolStatus("");
    if (isMobile) setSidebarOpen(false);
    inputRef.current?.focus();
  }

  function deleteConv(id: string) {
    deleteConversation(id);
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
      setMessages([]);
    }
  }

  async function handleSend(text: string) {
    const content = text.trim();
    if (!content || typing) return;

    // Create conversation if none active
    let conv = active;
    if (!conv) {
      const c = addConversation({ messages: [], agentId: undefined });
      conv = c;
      setActiveId(c.id);
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    addMessage(conv.id, userMsg);
    setMessages(newMessages);
    setInput("");
    setTyping(true);
    setToolStatus("🤔 Мисля…");

    try {
      const reply = await askJustin(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        (text) => setToolStatus(text),
        (tool) => setToolStatus(tool),
      );

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
      };

      addMessage(conv.id, assistantMsg);
      setMessages((prev) => [...prev, assistantMsg]);
      setTyping(false);
      setToolStatus("");
      updateConversation(conv.id, { title: content.slice(0, 40) });
    } catch {
      setTyping(false);
      setToolStatus("");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  // Quick prompts
  const prompts = active && messages.length === 0
    ? ["Какво да свърша днес?", "Обобщи активните проекти", "Кои са спешните задачи?"]
    : messages.length > 0 && !typing
      ? ["Разбий на стъпки", "Какво е спешно?", "Предложи следващи действия"]
      : [];

  // Show empty state if no conversations at all, show the chat otherwise
  const showEmpty = conversations.length === 0 && !activeId;

  return (
    <div className="flex h-full">
      {/* ── sidebar ── */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <span className="flex items-center gap-2 font-semibold">
            <Sparkles size={17} className="text-[var(--accent)]" />
            Justin
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={newConv}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Нов разговор"
            >
              <Plus size={18} />
            </button>
            <button className="md:hidden text-[var(--muted)]" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-[var(--muted-2)]">Все още няма разговори.</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={newConv}>
                <Sparkles size={14} /> Започни
              </Button>
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConv(c.id)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                activeId === c.id ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-black">
                <Sparkles size={13} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="truncate text-xs text-[var(--muted-2)]">
                  {relativeTime(c.updatedAt)} · {c.messages.length} съобщ.
                </p>
              </div>
              {activeId === c.id && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              )}
              <span
                onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }}
                className="shrink-0 text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 size={14} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── main chat area ── */}
      {showEmpty ? (
        <EmptyState onNewChat={newConv} onOpenList={() => setSidebarOpen(true)} />
      ) : (
        <div className="flex flex-1 flex-col min-w-0">
          {/* header */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 bg-[var(--surface)]">
            <button className="md:hidden text-[var(--muted)]" onClick={() => setSidebarOpen(true)}>
              <PanelLeft size={20} />
            </button>

            <div className="gradient-border flex h-9 w-9 items-center justify-center rounded-xl">
              <span className="flex h-full w-full items-center justify-center rounded-xl bg-white text-black">
                <Sparkles size={17} weight="fill" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Justin</p>
              <p className="truncate text-xs text-[var(--muted-2)]">
                {typing
                  ? toolStatus || "пише…"
                  : active
                    ? `${active.messages.length} съобщения`
                    : "AI асистент"}
              </p>
            </div>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <EmptyChat
                userName={currentUser?.name?.split(" ")[0]}
                prompts={prompts}
                onPick={(t) => handleSend(t)}
              />
            ) : (
              <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
                {messages.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    userColor={currentUser?.color}
                    userName={currentUser?.name}
                    isLast={i === messages.length - 1}
                  />
                ))}
                {typing && <TypingIndicator status={toolStatus} />}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <div className="mx-auto max-w-3xl">
              {prompts.length > 0 && !typing && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {prompts.slice(0, 3).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="group relative truncate rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--foreground)] hover:shadow-[0_0_12px_rgba(139,92,246,0.2)] cursor-pointer overflow-hidden"
                    >
                      <span className="relative z-10">{p}</span>
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-2 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напиши съобщение…"
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
      <div className="aurora">
        <div className="aurora-blob drift-a h-80 w-80" style={{ background: "rgba(139,92,246,0.25)", top: "5%", left: "15%" }} />
        <div className="aurora-blob drift-b h-96 w-96" style={{ background: "rgba(59,130,246,0.15)", top: "35%", right: "10%" }} />
        <div className="aurora-blob drift-c h-64 w-64" style={{ background: "rgba(236,72,153,0.1)", bottom: "5%", left: "30%" }} />
      </div>

      <button className="absolute left-4 top-4 md:hidden text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer" onClick={onOpenList}>
        <PanelLeft size={20} />
      </button>

      <div className="relative z-10 flex flex-col items-center">
        <div className="gradient-border mb-6 flex h-24 w-24 items-center justify-center rounded-2xl">
          <span className="flex h-full w-full items-center justify-center rounded-2xl bg-white text-black">
            <Sparkles size={42} />
          </span>
        </div>

        <h2 className="text-3xl font-semibold tracking-tight">Justin</h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)] leading-relaxed">
          Твоят AI асистент. Свързан с проектите, задачите и екипа ти.
          <br />
          Говори с мен за всичко.
        </p>

        <Button variant="primary" size="lg" className="mt-8 shine" onClick={onNewChat}>
          <Sparkles size={18} weight="fill" /> Започни разговор
        </Button>
      </div>
    </div>
  );
}

// ─── Empty chat ─────────────────────────────────────────────────
function EmptyChat({
  userName,
  prompts,
  onPick,
}: {
  userName?: string;
  prompts: string[];
  onPick: (s: string) => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="aurora">
        <div className="aurora-blob drift-a h-48 w-48" style={{ background: "rgba(139,92,246,0.2)", top: "10%", left: "20%" }} />
        <div className="aurora-blob drift-b h-56 w-56" style={{ background: "rgba(59,130,246,0.12)", top: "40%", right: "20%" }} />
      </div>

      <div className="relative z-10">
        <div className="gradient-border mb-5 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
          <span className="flex h-full w-full items-center justify-center rounded-2xl bg-white text-black">
            <Sparkles size={26} />
          </span>
        </div>

        <h2 className="text-lg font-semibold tracking-tight">
          {userName ? `Какво да направим, ${userName}?` : "Какво да направим?"}
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

// ─── Message bubble ─────────────────────────────────────────────
function MessageBubble({
  role,
  content,
  userColor,
  userName,
  isLast,
}: {
  role: "user" | "assistant";
  content: string;
  userColor?: string;
  userName?: string;
  isLast: boolean;
}) {
  if (role === "user") {
    return (
      <div className={cn("flex justify-end gap-3", isLast ? "animate-in" : "")} style={{ animationDelay: "0.05s" }}>
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
          {content}
        </div>
        <Avatar name={userName ?? "?"} color={userColor} size={30} />
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isLast ? "animate-in" : "")} style={{ animationDelay: "0.12s" }}>
      <div className="gradient-border flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        <span className="flex h-full w-full items-center justify-center rounded-xl bg-white text-black">
          <Sparkles size={15} weight="fill" />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <span className="text-xs font-medium text-[var(--accent)]">Justin</span>
        <div className="prose-sm whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
          {content}
        </div>
      </div>
    </div>
  );
}

// ─── Typing indicator ───────────────────────────────────────────
function TypingIndicator({ status }: { status: string }) {
  return (
    <div className="flex gap-3 animate-in">
      <div className="gradient-border flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        <span className="flex h-full w-full items-center justify-center rounded-xl bg-white text-black">
          <Sparkles size={14} weight="fill" />
        </span>
      </div>
      <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--surface-2)] px-4 py-3">
        {status ? (
          <span className="text-sm text-[var(--muted)]">{status}</span>
        ) : (
          <>
            <span className="typing-dot h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="typing-dot h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="typing-dot h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
          </>
        )}
      </div>
    </div>
  );
}
