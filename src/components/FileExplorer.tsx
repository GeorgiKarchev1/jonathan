"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Attachment, ID } from "@/lib/types";
import { Button, Field, Input, Modal, Textarea, EmptyState } from "./ui";
import { cn, formatBytes, relativeTime } from "@/lib/utils";
import {
  Folder, FolderOpen, FolderPlus, FileText, Link2, Upload,
  Trash2, StickyNote, Plus, CaretRight, CaretDown, Building2, FolderKanban, Home,
} from "@/components/icons";

type Scope =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "company"; id: ID }
  | { kind: "project"; id: ID };

function sameScope(a: Scope, b: Scope) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "company" && b.kind === "company") return a.id === b.id;
  if (a.kind === "project" && b.kind === "project") return a.id === b.id;
  return true;
}

export function FileExplorer({ lockCompanyId }: { lockCompanyId?: ID }) {
  const { data, addAttachment, deleteAttachment, addFolder, deleteFolder, renameFolder, currentUser } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [scope, setScope] = useState<Scope>(
    lockCompanyId ? { kind: "company", id: lockCompanyId } : { kind: "all" }
  );
  const [folderId, setFolderId] = useState<ID | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<ID>>(() => new Set(lockCompanyId ? [lockCompanyId] : []));

  const [folderModal, setFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [note, setNote] = useState({ name: "", body: "" });
  const [link, setLink] = useState({ name: "", url: "" });

  const companies = lockCompanyId ? data.companies.filter((c) => c.id === lockCompanyId) : data.companies;

  function selectScope(s: Scope) {
    setScope(s);
    setFolderId(undefined);
  }

  // ---- scope predicates ----
  function fileMatches(a: Attachment): boolean {
    switch (scope.kind) {
      case "all": return true;
      case "none": return !a.companyId && !a.projectId;
      case "company": return a.companyId === scope.id && !a.projectId;
      case "project": return a.projectId === scope.id;
    }
  }
  function folderMatches(f: { companyId?: ID; projectId?: ID }): boolean {
    switch (scope.kind) {
      case "all": return false; // folders live inside a client/project scope
      case "none": return !f.companyId && !f.projectId;
      case "company": return f.companyId === scope.id && !f.projectId;
      case "project": return f.projectId === scope.id;
    }
  }

  // scope → fields stamped onto newly created items (null = creation disabled)
  const newItemScope = useMemo((): { companyId?: ID; projectId?: ID } | null => {
    switch (scope.kind) {
      case "all": return null;
      case "none": return {};
      case "company": return { companyId: scope.id };
      case "project": {
        const p = data.projects.find((x) => x.id === scope.id);
        return { companyId: p?.companyId, projectId: scope.id };
      }
    }
  }, [scope, data.projects]);

  const scopeFolders = useMemo(() => data.folders.filter(folderMatches), [data.folders, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const scopeFiles = useMemo(() => data.attachments.filter(fileMatches), [data.attachments, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // breadcrumb of nested folders
  const folderPath = useMemo(() => {
    const path: { id: ID; name: string }[] = [];
    let cur = folderId;
    const byId = new Map(data.folders.map((f) => [f.id, f]));
    while (cur) {
      const f = byId.get(cur);
      if (!f) break;
      path.unshift({ id: f.id, name: f.name });
      cur = f.parentId;
    }
    return path;
  }, [folderId, data.folders]);

  const childFolders = scopeFolders.filter((f) => (f.parentId ?? undefined) === folderId);
  const filesHere = scopeFiles.filter((a) => (a.folderId ?? undefined) === folderId);
  const images = filesHere.filter((a) => a.kind === "image");
  const others = filesHere.filter((a) => a.kind !== "image");

  const scopeTitle = useMemo(() => {
    switch (scope.kind) {
      case "all": return "Всички файлове";
      case "none": return "Без клиент";
      case "company": return data.companies.find((c) => c.id === scope.id)?.name ?? "Клиент";
      case "project": return data.projects.find((p) => p.id === scope.id)?.name ?? "Проект";
    }
  }, [scope, data.companies, data.projects]);

  // ---- actions ----
  function onFiles(files: FileList | null) {
    if (!files || !newItemScope) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        addAttachment({
          ...newItemScope,
          folderId,
          kind: file.type.startsWith("image/") ? "image" : "file",
          name: file.name,
          url: String(reader.result),
          mime: file.type,
          size: file.size,
          uploadedBy: currentUser?.id,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function createFolder() {
    if (!folderName.trim() || !newItemScope) return;
    addFolder({ ...newItemScope, parentId: folderId, name: folderName.trim() });
    setFolderName("");
    setFolderModal(false);
  }

  const canCreate = newItemScope !== null;

  return (
    <div className="flex min-h-[28rem] overflow-hidden rounded-xl border border-[var(--border)]">
      {/* Tree */}
      <div className="w-60 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-2">
        {!lockCompanyId && (
          <TreeRow
            label="Всички файлове"
            icon={<Home size={15} />}
            active={scope.kind === "all"}
            onClick={() => selectScope({ kind: "all" })}
          />
        )}
        {companies.map((c) => {
          const projects = data.projects.filter((p) => p.companyId === c.id);
          const open = expanded.has(c.id);
          return (
            <div key={c.id}>
              <TreeRow
                label={c.name}
                icon={<Building2 size={15} />}
                active={sameScope(scope, { kind: "company", id: c.id })}
                onClick={() => selectScope({ kind: "company", id: c.id })}
                caret={projects.length > 0 ? (open ? "down" : "right") : undefined}
                onCaret={() => setExpanded((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
              />
              {open && projects.map((p) => (
                <TreeRow
                  key={p.id}
                  label={p.name}
                  icon={<FolderKanban size={14} />}
                  indent
                  dot={p.color}
                  active={sameScope(scope, { kind: "project", id: p.id })}
                  onClick={() => selectScope({ kind: "project", id: p.id })}
                />
              ))}
            </div>
          );
        })}
        {!lockCompanyId && (
          <TreeRow
            label="Без клиент"
            icon={<Folder size={15} />}
            active={scope.kind === "none"}
            onClick={() => selectScope({ kind: "none" })}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {/* Breadcrumb + actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            <button onClick={() => setFolderId(undefined)} className="truncate font-medium text-[var(--foreground)] hover:underline cursor-pointer">
              {scopeTitle}
            </button>
            {folderPath.map((f) => (
              <span key={f.id} className="flex items-center gap-1">
                <CaretRight size={13} className="text-[var(--muted-2)]" />
                <button onClick={() => setFolderId(f.id)} className="truncate text-[var(--muted)] hover:text-[var(--foreground)] hover:underline cursor-pointer">{f.name}</button>
              </span>
            ))}
          </div>
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setFolderModal(true)}><FolderPlus size={14} /> Папка</Button>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> Качи</Button>
              <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}><StickyNote size={14} /> Бележка</Button>
              <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}><Link2 size={14} /> Линк</Button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            </div>
          )}
        </div>

        {!canCreate && (
          <p className="mb-4 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
            Избери клиент или проект отляво, за да добавяш файлове и папки.
          </p>
        )}

        {/* Folders */}
        {childFolders.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {childFolders.map((f) => {
              const count = scopeFiles.filter((a) => a.folderId === f.id).length
                + scopeFolders.filter((x) => x.parentId === f.id).length;
              return (
                <div key={f.id} className="group relative">
                  <button
                    onClick={() => setFolderId(f.id)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    <FolderOpen size={20} className="shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="text-xs text-[var(--muted-2)]">{count} елемент{count === 1 ? "" : "а"}</span>
                    </span>
                  </button>
                  <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => { const n = prompt("Ново име на папката:", f.name); if (n?.trim()) renameFolder(f.id, n.trim()); }} className="rounded-md bg-[var(--surface-3)] p-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Преименувай"><Plus size={12} className="rotate-45" /></button>
                    <button onClick={() => { if (confirm(`Изтриване на папка „${f.name}"? Файловете в нея остават.`)) deleteFolder(f.id); }} className="rounded-md bg-[var(--surface-3)] p-1 text-[var(--muted)] hover:text-[var(--red)] cursor-pointer" aria-label="Изтрий"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {filesHere.length === 0 && childFolders.length === 0 && (
          <EmptyState icon={<FileText size={22} />} title="Тук няма нищо"
            description={canCreate ? "Качи файл, създай папка или добави бележка/линк." : "Избери клиент или проект, за да добавиш съдържание."} />
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((a) => (
              <div key={a.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => deleteAttachment(a.id)} className="ml-auto rounded-md bg-black/50 p-1.5 text-white hover:bg-[var(--red)] cursor-pointer"><Trash2 size={14} /></button>
                  <span className="truncate text-xs text-white">{a.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Files / notes / links */}
        {others.length > 0 && (
          <div className="space-y-2">
            {others.map((a) => (
              <div key={a.id} className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
                  {a.kind === "note" ? <StickyNote size={16} /> : a.kind === "link" ? <Link2 size={16} /> : <FileText size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    {a.size && <span className="text-xs text-[var(--muted-2)]">{formatBytes(a.size)}</span>}
                  </div>
                  {a.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{a.body}</p>}
                  {a.kind === "link" && a.url && (
                    <a href={a.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-block truncate text-sm text-[var(--accent)] hover:underline">{a.url}</a>
                  )}
                  {a.kind === "file" && a.url && (
                    <a href={a.url} download={a.name} className="mt-0.5 inline-block text-xs text-[var(--accent)] hover:underline">Изтегли</a>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted-2)]">{relativeTime(a.createdAt)}</p>
                </div>
                <button onClick={() => deleteAttachment(a.id)} className="text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100 cursor-pointer"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New folder modal */}
      <Modal open={folderModal} onClose={() => setFolderModal(false)} title="Нова папка"
        footer={<>
          <Button variant="ghost" onClick={() => setFolderModal(false)}>Отказ</Button>
          <Button variant="primary" disabled={!folderName.trim()} onClick={createFolder}><FolderPlus size={15} /> Създай</Button>
        </>}>
        <Field label="Име на папката">
          <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="напр. Договори" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }} />
        </Field>
      </Modal>

      {/* Note modal */}
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Нова бележка"
        footer={<>
          <Button variant="ghost" onClick={() => setNoteOpen(false)}>Отказ</Button>
          <Button variant="primary" disabled={!note.name.trim()} onClick={() => {
            if (!newItemScope) return;
            addAttachment({ ...newItemScope, folderId, kind: "note", name: note.name.trim(), body: note.body, uploadedBy: currentUser?.id });
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
            if (!newItemScope) return;
            addAttachment({ ...newItemScope, folderId, kind: "link", name: link.name.trim(), url: link.url.trim(), uploadedBy: currentUser?.id });
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

function TreeRow({
  label, icon, active, onClick, indent, dot, caret, onCaret,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  indent?: boolean;
  dot?: string;
  caret?: "right" | "down";
  onCaret?: () => void;
}) {
  return (
    <div className={cn("flex items-center rounded-lg", active ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]")}>
      {caret ? (
        <button onClick={(e) => { e.stopPropagation(); onCaret?.(); }} className="flex h-7 w-5 items-center justify-center text-[var(--muted-2)] cursor-pointer">
          {caret === "down" ? <CaretDown size={13} /> : <CaretRight size={13} />}
        </button>
      ) : (
        <span className={cn("w-5", indent && "w-7")} />
      )}
      <button
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left text-sm cursor-pointer",
          active ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"
        )}
      >
        {dot ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} /> : <span className="shrink-0 text-[var(--muted-2)]">{icon}</span>}
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}
