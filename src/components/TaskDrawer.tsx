"use client";

import { useRouter } from "next/navigation";
import { useStore, userById } from "@/lib/store";
import type { ID, Priority, TaskStatus } from "@/lib/types";
import { TASK_STATUS, PRIORITY } from "@/lib/types";
import { Avatar, Button, Field, Input, Select, Textarea, IconButton } from "./ui";
import { formatDate, formatRange } from "@/lib/utils";
import { useEffect, useState } from "react";
import { X, Trash2, Sparkles, Clock, Plus, Play } from "@/components/icons";

export function TaskDrawer({ taskId, onClose }: { taskId: ID | null; onClose: () => void }) {
  const { data, updateTask, deleteTask, addTimeLog, currentUser, addConversation } = useStore();
  const router = useRouter();
  const task = data.tasks.find((t) => t.id === taskId) ?? null;
  const [logOpen, setLogOpen] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [logDate, setLogDate] = useState("");

  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskId, onClose]);

  if (!task) return null;
  const project = data.projects.find((p) => p.id === task.projectId);
  const assignable = project ? data.users.filter((u) => project.memberIds.includes(u.id)) : data.users;

  function startChat(execute = false) {
    if (!task) return;
    const conv = addConversation({
      title: execute ? `Изпълни: ${task.title}` : `Чат: ${task.title}`,
      projectId: task.projectId,
      taskId: task.id,
      messages: [],
    });
    onClose();
    router.push(`/chat?c=${conv.id}${execute ? "&execute=1" : ""}`);
  }

  function addLog() {
    if (!logDate || !currentUser) return;
    addTimeLog(task!.id, {
      userId: currentUser.id,
      startDate: logDate,
      hours: logHours ? Number(logHours) : undefined,
    });
    setLogHours(""); setLogDate(""); setLogOpen(false);
  }

  const totalHours = task.timeLogs.reduce((s, l) => s + (l.hours ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in" onClick={onClose} />
      <div className="card glass relative z-10 my-auto flex max-h-[90vh] w-full max-w-lg flex-col animate-in shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <span className="text-xs text-[var(--muted)]">{project?.name}</span>
          <div className="flex items-center gap-1">
            <IconButton onClick={() => { deleteTask(task.id); onClose(); }} aria-label="Изтрий">
              <Trash2 size={16} />
            </IconButton>
            <IconButton onClick={onClose} aria-label="Затвори"><X size={18} /></IconButton>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <input
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            className="focus-ring w-full rounded-lg bg-transparent text-lg font-semibold outline-none hover:bg-[var(--surface-2)] px-2 -mx-2 py-1"
          />

          {/* AI actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => startChat(true)}>
              <Play size={15} /> Изпълни с AI
            </Button>
            <Button variant="secondary" onClick={() => startChat(false)}>
              <Sparkles size={15} /> Питай AI
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Статус">
              <Select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}>
                {Object.entries(TASK_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Приоритет">
              <Select value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })}>
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Отговорник">
              <Select value={task.assigneeId ?? ""} onChange={(e) => updateTask(task.id, { assigneeId: e.target.value || undefined })}>
                <option value="">—</option>
                {assignable.map((u) => (
                  <option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Краен срок">
              <Input type="date" value={task.dueDate ?? ""} onChange={(e) => updateTask(task.id, { dueDate: e.target.value || undefined })} />
            </Field>
          </div>

          <Field label="Описание">
            <Textarea
              value={task.description ?? ""}
              onChange={(e) => updateTask(task.id, { description: e.target.value })}
              placeholder="Добави детайли…"
            />
          </Field>

          {/* time logs */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)]">
                <Clock size={14} /> Отчетено време {totalHours > 0 && `· ${totalHours} ч`}
              </span>
              <button onClick={() => setLogOpen((v) => !v)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">
                <Plus size={13} className="inline" /> Добави
              </button>
            </div>

            {logOpen && (
              <div className="mb-2 flex items-end gap-2 rounded-lg border border-[var(--border)] p-3">
                <Field label="Дата"><Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} /></Field>
                <Field label="Часове"><Input type="number" value={logHours} onChange={(e) => setLogHours(e.target.value)} placeholder="8" /></Field>
                <Button variant="primary" size="sm" onClick={addLog} disabled={!logDate}>Запази</Button>
              </div>
            )}

            <div className="space-y-1.5">
              {task.timeLogs.length === 0 && <p className="text-xs text-[var(--muted-2)]">Все още няма отчетено време.</p>}
              {task.timeLogs.map((l) => {
                const u = userById(data, l.userId);
                return (
                  <div key={l.id} className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                    {u && <Avatar name={u.name} color={u.color} size={22} />}
                    <span className="flex-1 truncate">{u?.name.split(" ")[0]}</span>
                    <span className="text-xs text-[var(--muted)]">{formatRange(l.startDate, l.endDate)}</span>
                    {l.hours != null && <span className="text-xs font-medium">{l.hours} ч</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-[var(--muted-2)]">
            Създадена {formatDate(task.createdAt)}
            {task.completedAt && ` · завършена ${formatDate(task.completedAt)}`}
          </p>
        </div>
      </div>
    </div>
  );
}
