"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { generateReply, quickPrompts } from "@/lib/ai";
import { Avatar, Button, Select } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { ChatAction, Conversation } from "@/lib/types";
import {
  Sparkles, Send, Plus, MessageSquare, Trash2, Play, CheckCircle2,
  ListChecks, FileText, X, PanelLeft, Robot,
} from "@/components/icons";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--muted)]">Зареждане…</div>}>
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const { data, addConversation, deleteConversation } = useStore();
  const params = useSearchParams();
  const router = useRouter();

  const [listOpen, setListOpen] = useState(false);

  const conversations = useMemo(
    () => [...data.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.conversations]
  );

  // panes come from ?panes=a,b,c  (fallback: legacy ?c=ID&execute=1)
  const rawPanes = params.get("panes");
  const single = params.get("c");
  const execute = params.get("execute") === "1";
  const requested = rawPanes ? rawPanes.split(",") : single ? [single] : [];
  const panes = requested.filter((id) => data.conversations.some((c) => c.id === id));

  function setPanes(ids: string[]) {
    router.replace(ids.length ? `/chat?panes=${ids.join(",")}` : "/chat");
  }

  // ensure something is open
  useEffect(() => {
    if (panes.length === 0 && conversations.length > 0 && !rawPanes && !single) {
      router.replace(`/chat?panes=${conversations[0].id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panes.length, conversations.length]);

  function openPane(id: string) {
    if (!panes.includes(id)) setPanes([...panes, id]);
    setListOpen(false);
  }
  function closePane(id: string) {
    setPanes(panes.filter((p) => p !== id));
  }
  function newChat() {
    const conv = addConversation({ messages: [] });
    setPanes([...panes, conv.id]);
    setListOpen(false);
  }

  return (
    <div className="flex h-full">
      {/* Conversations list */}
      <div className={cn(
        "absolute inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-transform md:static md:translate-x-0",
        listOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <span className="flex items-center gap-2 font-semibold"><MessageSquare size={17} className="text-[var(--muted)]" /> Чатове</span>
          <div className="flex items-center gap-1">
            <button onClick={newChat} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Нов чат"><Plus size={18} /></button>
            <button className="md:hidden text-[var(--muted)]" onClick={() => setListOpen(false)}><X size={18} /></button>
          </div>
        </div>
        <div className="space-y-0.5 overflow-y-auto p-2" style={{ height: "calc(100% - 4rem)" }}>
          {conversations.length === 0 && <p className="p-3 text-sm text-[var(--muted-2)]">Няма чатове още.</p>}
          {conversations.map((c) => {
            const p = data.projects.find((x) => x.id === c.projectId);
            const ag = data.agents.find((a) => a.id === c.agentId);
            const open = panes.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => openPane(c.id)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                  open ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]"
                )}
              >
                {ag ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: ag.color }}><Robot size={13} /></span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-3)] text-[var(--muted)]"><Sparkles size={13} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ag ? ag.name : c.title}</p>
                  <p className="truncate text-xs text-[var(--muted-2)]">
                    {p ? p.name : "Общ"} · {relativeTime(c.updatedAt)}
                  </p>
                </div>
                {open && <span className="text-[10px] font-medium text-[var(--accent)]">отворен</span>}
                <span
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {listOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setListOpen(false)} />}

      {/* Panes */}
      {panes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <button className="absolute left-4 top-4 md:hidden text-[var(--muted)]" onClick={() => setListOpen(true)}><PanelLeft size={20} /></button>
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black"><Sparkles size={30} /></span>
          <h2 className="text-2xl font-semibold tracking-tight">Започни разговор</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--muted)]">Отвори няколко агента едновременно — всеки в собствен панел.</p>
          <Button variant="primary" className="mt-6" onClick={newChat}><Plus size={16} /> Нов чат</Button>
        </div>
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

function ChatPane({
  convId, autoExecute, flex, canClose, onClose, onOpenList,
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

  const active = data.conversations.find((c) => c.id === convId) ?? null;
  const project = data.projects.find((p) => p.id === active?.projectId) ?? null;
  const task = data.tasks.find((t) => t.id === active?.taskId) ?? null;
  const agent = data.agents.find((a) => a.id === active?.agentId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, typing]);

  function reply(text: string, conv: Conversation) {
    setTyping(true);
    const proj = data.projects.find((p) => p.id === conv.projectId) ?? null;
    const tsk = data.tasks.find((t) => t.id === conv.taskId) ?? null;
    const ag = data.agents.find((a) => a.id === conv.agentId) ?? null;
    const result = generateReply(text, { agent: ag, project: proj, task: tsk, userName: currentUser?.name });
    window.setTimeout(() => {
      addMessage(conv.id, { role: "assistant", content: result.content, action: result.action });
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

  // auto-execute from "Изпълни с AI"
  useEffect(() => {
    if (autoExecute && active && !executedRef.current && active.messages.length === 0 && !typing) {
      executedRef.current = true;
      const txt = "Изпълни тази задача";
      addMessage(active.id, { role: "user", content: txt });
      reply(txt, active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExecute, active?.id]);

  if (!active) return null;
  const prompts = quickPrompts({ project, task });

  return (
    <div className={cn("flex h-full min-w-[340px] flex-col border-r border-[var(--border)]", flex ? "flex-1" : "w-[400px] shrink-0")}>
      {/* header */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-4">
        <button className="md:hidden text-[var(--muted)]" onClick={onOpenList}><PanelLeft size={20} /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: agent ? agent.color : "#ffffff", color: agent ? "#fff" : "#000" }}>
          {agent ? <Robot size={17} /> : <Sparkles size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{agent ? agent.name : active.title}</p>
          <ContextChips agent={agent} project={project} task={task} />
        </div>
        <Select
          value={active.agentId ?? ""}
          onChange={(e) => updateConversation(active.id, { agentId: e.target.value || undefined })}
          className="hidden w-32 lg:block"
        >
          <option value="">AI Асистент</option>
          {data.agents.filter((a) => a.status === "active").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        {canClose && (
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Затвори панела">
            <X size={17} />
          </button>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {active.messages.length === 0 ? (
          <EmptyChat userName={currentUser?.name.split(" ")[0]} agentName={agent?.name} prompts={prompts} onPick={send} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {active.messages.map((m) => (
              <Message key={m.id} role={m.role} content={m.content} action={m.action}
                userColor={currentUser?.color} userName={currentUser?.name} agentColor={agent?.color}
                onExecuteDone={(taskId) => updateTask(taskId, { status: "done" })}
              />
            ))}
            {typing && <TypingBubble agentColor={agent?.color} />}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {active.messages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {prompts.slice(0, 3).map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="truncate rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)] cursor-pointer">
                  {p}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-2 transition-colors focus-within:border-[var(--accent)]"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={agent ? `Питай ${agent.name}…` : "Напиши съобщение…"}
              rows={1}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[var(--muted-2)]"
            />
            <Button type="submit" variant="primary" disabled={!input.trim() || typing} className="h-9 px-3"><Send size={16} /></Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ContextChips({ agent, project, task }: { agent?: { name: string; model: string } | null; project: { name: string; color: string } | null; task: { title: string } | null }) {
  if (!agent && !project && !task) return <p className="text-xs text-[var(--muted-2)]">Без контекст</p>;
  return (
    <div className="flex items-center gap-1.5">
      {agent && (
        <span className="inline-flex items-center gap-1 truncate text-xs text-[var(--muted)]">
          <Robot size={11} /> {agent.model}
        </span>
      )}
      {project && (
        <span className="inline-flex items-center gap-1 truncate text-xs text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full" style={{ background: project.color }} /> {project.name}
        </span>
      )}
      {task && (
        <span className="inline-flex items-center gap-1 truncate rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
          <ListChecks size={11} /> {task.title}
        </span>
      )}
    </div>
  );
}

function Message({
  role, content, action, userColor, userName, agentColor, onExecuteDone,
}: {
  role: "user" | "assistant";
  content: string;
  action?: ChatAction;
  userColor?: string;
  userName?: string;
  agentColor?: string;
  onExecuteDone: (taskId: string) => void;
}) {
  const [done, setDone] = useState(action?.done ?? false);
  if (role === "user") {
    return (
      <div className="flex justify-end gap-3 animate-in">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--foreground)] whitespace-pre-wrap">
          {content}
        </div>
        <Avatar name={userName ?? "?"} color={userColor} size={30} />
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-in">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--foreground)]"
        style={agentColor ? { background: agentColor, color: "#fff", borderColor: "transparent" } : undefined}
      >
        {agentColor ? <Robot size={15} /> : <Sparkles size={15} />}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="prose-sm whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{content}</div>
        {action && (
          <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 pl-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              {action.type === "execute_task" ? <Play size={13} className="text-[var(--accent)]" /> : <FileText size={13} className="text-[var(--accent)]" />}
              {action.label}
            </span>
            {action.type === "execute_task" && action.taskId && (
              done ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[rgba(34,197,94,0.14)] px-2 py-1 text-xs text-[var(--green)]">
                  <CheckCircle2 size={13} /> Готово
                </span>
              ) : (
                <button
                  onClick={() => { setDone(true); onExecuteDone(action.taskId!); }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black hover:bg-white/90 cursor-pointer"
                >
                  <CheckCircle2 size={13} /> Маркирай като готово
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble({ agentColor }: { agentColor?: string }) {
  return (
    <div className="flex gap-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--foreground)]"
        style={agentColor ? { background: agentColor, color: "#fff", borderColor: "transparent" } : undefined}
      >
        {agentColor ? <Robot size={15} /> : <Sparkles size={15} />}
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl bg-[var(--surface-2)] px-4 py-3.5">
        <span className="typing-dot h-2 w-2 rounded-full bg-[var(--muted)]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-[var(--muted)]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-[var(--muted)]" />
      </div>
    </div>
  );
}

function EmptyChat({ userName, agentName, prompts, onPick }: { userName?: string; agentName?: string; prompts: string[]; onPick: (s: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
        <Sparkles size={26} />
      </span>
      <h2 className="text-xl font-semibold tracking-tight">{agentName ? `Чат с ${agentName}` : `С какво да помогна${userName ? `, ${userName}` : ""}?`}</h2>
      <div className="mt-6 grid w-full max-w-sm gap-2">
        {prompts.map((p) => (
          <button key={p} onClick={() => onPick(p)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-left text-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] cursor-pointer">
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
