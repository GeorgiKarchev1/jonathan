"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { ID } from "@/lib/types";
import { Button, Field, Input, Modal, Textarea, EmptyState } from "./ui";
import { formatBytes, relativeTime } from "@/lib/utils";
import { Image as ImageIcon, FileText, Link2, Upload, Trash2, StickyNote, Plus } from "@/components/icons";

export function Attachments({ projectId, taskId }: { projectId: ID; taskId?: ID }) {
  const { data, addAttachment, deleteAttachment, uploadFile, currentUser } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [note, setNote] = useState({ name: "", body: "" });
  const [link, setLink] = useState({ name: "", url: "" });

  const items = data.attachments.filter((a) => a.projectId === projectId && (taskId ? a.taskId === taskId : true));
  const images = items.filter((a) => a.kind === "image");
  const others = items.filter((a) => a.kind !== "image");

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile(file, projectId);
        addAttachment({
          projectId,
          taskId,
          kind: file.type.startsWith("image/") ? "image" : "file",
          name: file.name,
          url,
          mime: file.type,
          size: file.size,
          uploadedBy: currentUser?.id,
        });
      } catch (e) {
        console.error("[attachments] upload failed:", e);
        alert(`Качването на „${file.name}" се провали.`);
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Качи файл / снимка</Button>
        <Button variant="outline" onClick={() => setNoteOpen(true)}><StickyNote size={15} /> Бележка</Button>
        <Button variant="outline" onClick={() => setLinkOpen(true)}><Link2 size={15} /> Линк</Button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {items.length === 0 && (
        <EmptyState icon={<ImageIcon size={22} />} title="Няма прикачени файлове"
          description="Качи снимки, документи, добави бележки или линкове към този проект." />
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((a) => (
            <div key={a.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => deleteAttachment(a.id)} className="ml-auto rounded-md bg-black/50 p-1.5 text-white hover:bg-[var(--red)] cursor-pointer">
                  <Trash2 size={14} />
                </button>
                <span className="truncate text-xs text-white">{a.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          {others.map((a) => (
            <div key={a.id} className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
                {a.kind === "note" ? <FileText size={16} /> : a.kind === "link" ? <Link2 size={16} /> : <FileText size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  {a.size && <span className="text-xs text-[var(--muted-2)]">{formatBytes(a.size)}</span>}
                </div>
                {a.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{a.body}</p>}
                {a.kind === "link" && a.url && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-block truncate text-sm text-[var(--accent)] hover:underline">
                    {a.url}
                  </a>
                )}
                <p className="mt-1 text-xs text-[var(--muted-2)]">{relativeTime(a.createdAt)}</p>
              </div>
              <button onClick={() => deleteAttachment(a.id)} className="text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100 cursor-pointer">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Note modal */}
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Нова бележка"
        footer={<>
          <Button variant="ghost" onClick={() => setNoteOpen(false)}>Отказ</Button>
          <Button variant="primary" disabled={!note.name.trim()} onClick={() => {
            addAttachment({ projectId, taskId, kind: "note", name: note.name.trim(), body: note.body, uploadedBy: currentUser?.id });
            setNote({ name: "", body: "" }); setNoteOpen(false);
          }}><Plus size={15} /> Запази</Button>
        </>}>
        <div className="space-y-3">
          <Field label="Заглавие"><Input value={note.name} onChange={(e) => setNote((n) => ({ ...n, name: e.target.value }))} placeholder="напр. Бележки от срещата" autoFocus /></Field>
          <Field label="Текст"><Textarea value={note.body} onChange={(e) => setNote((n) => ({ ...n, body: e.target.value }))} className="min-h-32" /></Field>
        </div>
      </Modal>

      {/* Link modal */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Нов линк"
        footer={<>
          <Button variant="ghost" onClick={() => setLinkOpen(false)}>Отказ</Button>
          <Button variant="primary" disabled={!link.name.trim() || !link.url.trim()} onClick={() => {
            addAttachment({ projectId, taskId, kind: "link", name: link.name.trim(), url: link.url.trim(), uploadedBy: currentUser?.id });
            setLink({ name: "", url: "" }); setLinkOpen(false);
          }}><Plus size={15} /> Запази</Button>
        </>}>
        <div className="space-y-3">
          <Field label="Описание"><Input value={link.name} onChange={(e) => setLink((l) => ({ ...l, name: e.target.value }))} placeholder="напр. Дизайн в Figma" autoFocus /></Field>
          <Field label="URL"><Input value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} placeholder="https://…" /></Field>
        </div>
      </Modal>
    </div>
  );
}
