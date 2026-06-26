"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { cn, relativeTime } from "@/lib/utils";
import { Feedback, X, Send, Image as ImageIcon, Lightning, Check } from "@/components/icons";

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

const MIN_W = 320;
const MIN_H = 380;

export function FeedbackWidget() {
  const { data, currentUser, submitFeedback } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [size, setSize] = useState<Size>({ w: 384, h: 560 });
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ sx: number; sy: number; ow: number; oh: number; ox: number; oy: number } | null>(null);

  const mine = useMemo(
    () => data.feedback.filter((f) => f.userId === currentUser?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.feedback, currentUser?.id]
  );

  // Keep the panel inside the viewport when the window resizes.
  useEffect(() => {
    function onResize() {
      setPos((p) => {
        if (!p) return p;
        return {
          x: Math.min(p.x, window.innerWidth - size.w - 8),
          y: Math.min(p.y, window.innerHeight - size.h - 8),
        };
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [size.w, size.h]);

  function readImage(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(file);
  }
  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) readImage(item.getAsFile());
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) readImage(file);
  }

  function send() {
    const t = text.trim();
    if (!t && !image) return;
    submitFeedback({ text: t, image: image ?? undefined, page: typeof window !== "undefined" ? window.location.pathname : undefined });
    setText("");
    setImage(null);
    setSent(true);
    window.setTimeout(() => setSent(false), 2500);
  }

  // ---- dragging the whole panel by its header ----
  function onHeaderPointerDown(e: React.PointerEvent) {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.top });
    moveRef.current = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHeaderPointerMove(e: React.PointerEvent) {
    const m = moveRef.current;
    if (!m || !panelRef.current) return;
    const w = panelRef.current.offsetWidth;
    const h = panelRef.current.offsetHeight;
    const x = Math.min(Math.max(8, m.ox + (e.clientX - m.sx)), window.innerWidth - w - 8);
    const y = Math.min(Math.max(8, m.oy + (e.clientY - m.sy)), window.innerHeight - h - 8);
    setPos({ x, y });
  }
  function onHeaderPointerUp(e: React.PointerEvent) {
    moveRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  // ---- resizing from the top-left grip ----
  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.top });
    setSize({ w: rect.width, h: rect.height });
    resizeRef.current = { sx: e.clientX, sy: e.clientY, ow: rect.width, oh: rect.height, ox: rect.left, oy: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onResizePointerMove(e: React.PointerEvent) {
    const r = resizeRef.current;
    if (!r) return;
    const dw = r.sx - e.clientX; // dragging left grows width
    const dh = r.sy - e.clientY; // dragging up grows height
    const w = Math.min(Math.max(MIN_W, r.ow + dw), window.innerWidth - 16);
    const h = Math.min(Math.max(MIN_H, r.oh + dh), window.innerHeight - 16);
    setSize({ w, h });
    setPos({ x: r.ox - (w - r.ow), y: r.oy - (h - r.oh) });
  }
  function onResizePointerUp(e: React.PointerEvent) {
    resizeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  const panelStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto", width: size.w, height: size.h }
    : { width: size.w, height: size.h };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          onPaste={onPaste}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
          onDrop={onDrop}
          style={panelStyle}
          className={cn(
            "fixed z-50 flex max-h-[90vh] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-2xl animate-in",
            dragOver ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border-strong)]",
            !pos && "bottom-24 right-5"
          )}
        >
          {/* resize grip (top-left) */}
          <div
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            className="absolute left-0 top-0 z-20 h-5 w-5 cursor-nwse-resize"
            title="Преоразмери"
          >
            <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-tl-sm border-l-2 border-t-2 border-[var(--muted-2)]" />
          </div>

          {/* header — drag handle */}
          <div
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            className="flex shrink-0 cursor-grab items-center justify-between border-b border-[var(--border)] px-4 py-3 active:cursor-grabbing select-none touch-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white"><Feedback size={17} /></span>
              <div>
                <p className="text-sm font-semibold leading-tight">Обратна връзка</p>
                <p className="text-[11px] text-[var(--muted-2)]">Опиши или прикачи нещо — стига до екипа</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} onPointerDown={(e) => e.stopPropagation()} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Затвори"><X size={18} /></button>
          </div>

          {/* My submissions */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {mine.length === 0 ? (
              <div className="py-6 text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)]"><Lightning size={20} /></span>
                <p className="text-sm font-medium">Имаш идея или проблем?</p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-[var(--muted)]">Опиши го отдолу и/или провлачи (drag &amp; drop) снимка — отива директно в списъка на екипа.</p>
              </div>
            ) : (
              mine.map((f) => {
                const first = f.messages.find((m) => m.from === "user");
                const reply = [...f.messages].reverse().find((m) => m.from === "owner");
                return (
                  <div key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="mb-1.5 flex items-center">
                      <span className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        f.status === "closed" ? "bg-[rgba(34,197,94,0.16)] text-[var(--green)]" : "bg-[rgba(245,158,11,0.16)] text-[var(--amber)]"
                      )}>
                        {f.status === "closed" ? <><Check size={10} /> Готово</> : "За правене"}
                      </span>
                    </div>
                    {first?.text && <p className="text-sm">{first.text}</p>}
                    {first?.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.image} alt="скрийншот" className="mt-1.5 max-h-28 rounded-lg border border-black/20" />
                    )}
                    {reply && (
                      <div className="mt-2 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
                        <span className="font-medium text-[var(--foreground)]">Отговор:</span> {reply.text}
                      </div>
                    )}
                    <p className="mt-1.5 text-[10px] text-[var(--muted-2)]">{relativeTime(f.updatedAt)}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-[var(--border)] p-3">
            {sent && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-[rgba(34,197,94,0.14)] px-3 py-2 text-xs text-[var(--green)]">
                <Check size={14} /> Изпратено — благодарим!
              </div>
            )}
            {image && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="преглед" className="h-12 w-12 rounded object-cover" />
                <span className="flex-1 truncate text-xs text-[var(--muted)]">Прикачена снимка</span>
                <button onClick={() => setImage(null)} className="text-[var(--muted-2)] hover:text-[var(--red)] cursor-pointer"><X size={15} /></button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5 focus-within:border-[var(--accent)]">
              <button onClick={() => fileRef.current?.click()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Прикачи снимка" title="Прикачи снимка">
                <ImageIcon size={17} />
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Опиши идея или проблем…"
                rows={1}
                className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-[var(--muted-2)]"
              />
              <button onClick={send} disabled={!text.trim() && !image} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black disabled:opacity-40 cursor-pointer disabled:cursor-default" aria-label="Изпрати">
                <Send size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { readImage(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <p className="mt-1.5 px-1 text-center text-[10px] text-[var(--muted-2)]">Провлачи снимка тук, постави (Ctrl/⌘+V) или прикачи.</p>
          </div>

          {/* drop overlay */}
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-[var(--accent-soft)]/90 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-[var(--accent)]">
                <ImageIcon size={32} />
                <p className="text-sm font-semibold">Пусни снимката тук</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 cursor-pointer",
          open ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "bg-[var(--accent)]"
        )}
        aria-label="Обратна връзка"
        title="Обратна връзка"
      >
        {open ? <X size={20} /> : <Feedback size={22} />}
      </button>
    </>
  );
}
