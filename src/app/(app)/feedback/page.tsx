"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shared";
import { Avatar, Button, EmptyState } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { ID } from "@/lib/types";
import { Feedback, Send, Image as ImageIcon, X, Trash2, Check } from "@/components/icons";

export default function FeedbackPage() {
  const { data, currentUser, replyFeedback, setFeedbackStatus, deleteFeedbackThread } = useStore();
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "all">("open");
  const [selected, setSelected] = useState<ID | null>(null);
  const [reply, setReply] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  const all = useMemo(
    () => [...data.feedback].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.feedback]
  );
  const visible = useMemo(
    () => (statusFilter === "all" ? all : all.filter((f) => f.status === statusFilter)),
    [all, statusFilter]
  );
  const thread = visible.find((t) => t.id === selected) ?? visible[0] ?? null;
  const openCount = data.feedback.filter((f) => f.status === "open").length;

  function readImage(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(file);
  }
  function send() {
    if (!thread || (!reply.trim() && !image)) return;
    replyFeedback(thread.id, { text: reply.trim(), image: image ?? undefined });
    setReply(""); setImage(null);
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Заявки" icon={<Feedback size={20} />} />
        <div className="p-8">
          <EmptyState icon={<Feedback size={22} />} title="Само за теб" description="Тази секция е достъпна само за акаунта-собственик." />
        </div>
      </div>
    );
  }

  const firstText = (t: typeof thread) => t?.messages.find((m) => m.from === "user")?.text ?? "(скрийншот)";

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Заявки"
        subtitle="Заявки и съобщения от потребителите — твоят to-do списък."
        icon={<Feedback size={20} />}
        actions={openCount > 0 ? <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white">{openCount} за правене</span> : undefined}
      />

      {all.length === 0 ? (
        <div className="p-8">
          <EmptyState icon={<Feedback size={22} />} title="Все още няма заявки" description="Когато потребител изпрати нещо през плаващия бутон, се появява тук." />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* List */}
          <div className="flex w-80 shrink-0 flex-col border-r border-[var(--border)]">
            <div className="flex gap-1 border-b border-[var(--border)] p-2">
              {([["open", "За правене"], ["closed", "Готови"], ["all", "Всички"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setStatusFilter(k)}
                  className={cn("flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    statusFilter === k ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]")}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {visible.length === 0 && <p className="p-4 text-sm text-[var(--muted-2)]">Няма нищо тук.</p>}
              {visible.map((t) => {
                const done = t.status === "closed";
                const thumb = t.messages.find((m) => m.from === "user")?.image;
                return (
                  <div key={t.id} className={cn("flex items-start gap-2.5 border-b border-[var(--border)] px-3 py-3 transition-colors", thread?.id === t.id ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]")}>
                    <button
                      onClick={() => setFeedbackStatus(t.id, done ? "open" : "closed")}
                      className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
                        done ? "border-[var(--green)] bg-[var(--green)] text-black" : "border-[var(--border-strong)] hover:border-[var(--accent)]")}
                      aria-label="Готово"
                    >
                      {done && <Check size={13} weight="bold" />}
                    </button>
                    <button onClick={() => setSelected(t.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", done && "text-[var(--muted)] line-through")}>{firstText(t)}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted-2)]">{t.userName} · {relativeTime(t.updatedAt)}</p>
                      </div>
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          {thread && (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{thread.userName}</p>
                  <p className="truncate text-xs text-[var(--muted-2)]">{thread.userEmail}{thread.page ? ` · от ${thread.page}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={thread.status === "open" ? "outline" : "secondary"} size="sm"
                    onClick={() => setFeedbackStatus(thread.id, thread.status === "open" ? "closed" : "open")}>
                    {thread.status === "open" ? <><Check size={14} /> Готово</> : "Върни"}
                  </Button>
                  <button onClick={() => { if (confirm("Изтриване?")) { deleteFeedbackThread(thread.id); setSelected(null); } }} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)] cursor-pointer" aria-label="Изтрий"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {thread.messages.map((m) => (
                  <div key={m.id} className={cn("flex gap-2", m.from === "owner" ? "justify-end" : "justify-start")}>
                    {m.from === "user" && <Avatar name={thread.userName} size={28} />}
                    <div className={cn("max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm", m.from === "owner" ? "rounded-tr-sm bg-[var(--accent)] text-white" : "rounded-tl-sm bg-[var(--surface-2)]")}>
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                      {m.image && (
                        <button onClick={() => setLightbox(m.image!)} className={cn("group relative block cursor-zoom-in", m.text && "mt-2")} title="Отвори на цял екран">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.image} alt="скрийншот" className="max-h-72 rounded-lg border border-black/20" />
                          <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"><ImageIcon size={15} /></span>
                        </button>
                      )}
                      <p className={cn("mt-1 text-[10px]", m.from === "owner" ? "text-white/70" : "text-[var(--muted-2)]")}>{relativeTime(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="border-t border-[var(--border)] p-4">
                {image && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="преглед" className="h-12 w-12 rounded object-cover" />
                    <span className="flex-1 truncate text-xs text-[var(--muted)]">Прикачена снимка</span>
                    <button onClick={() => setImage(null)} className="text-[var(--muted-2)] hover:text-[var(--red)] cursor-pointer"><X size={15} /></button>
                  </div>
                )}
                <div
                  onPaste={(e) => { const it = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/")); if (it) readImage(it.getAsFile()); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); readImage(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"))); }}
                  className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5 focus-within:border-[var(--accent)]"
                >
                  <button onClick={() => fileRef.current?.click()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] cursor-pointer"><ImageIcon size={17} /></button>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Отговори на ${thread.userName.split(" ")[0]}…`} rows={1}
                    className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-[var(--muted-2)]" />
                  <button onClick={send} disabled={!reply.trim() && !image} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black disabled:opacity-40 cursor-pointer"><Send size={16} /></button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { readImage(e.target.files?.[0]); e.target.value = ""; }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in"
        >
          <button onClick={() => setLightbox(null)} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer" aria-label="Затвори"><X size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="скрийншот" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
