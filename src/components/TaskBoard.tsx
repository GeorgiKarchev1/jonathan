"use client";

import { useState } from "react";
import { useStore, userById } from "@/lib/store";
import { TASK_STATUS, type ID, type Task, type TaskStatus } from "@/lib/types";
import { Avatar } from "./ui";
import { PriorityBadge } from "./shared";
import { NewTaskModal } from "./modals";
import { TaskDrawer } from "./TaskDrawer";
import { cn, formatDate } from "@/lib/utils";
import { Plus, CalendarClock } from "@/components/icons";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export function TaskBoard({ projectId }: { projectId: ID }) {
  const { data, moveTask } = useStore();
  const [openTask, setOpenTask] = useState<ID | null>(null);
  const [addIn, setAddIn] = useState<TaskStatus | null>(null);
  const [dragId, setDragId] = useState<ID | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  const tasks = data.tasks.filter((t) => t.projectId === projectId);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col).sort((a, b) => a.order - b.order);
          const meta = TASK_STATUS[col];
          return (
            <div
              key={col}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={() => {
                if (dragId) moveTask(dragId, col);
                setDragId(null); setOverCol(null);
              }}
              className={cn(
                "flex flex-col rounded-xl border bg-[var(--surface)] p-2.5 transition-colors",
                overCol === col ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                  <span className="text-[var(--muted-2)]">{colTasks.length}</span>
                </span>
                <button onClick={() => setAddIn(col)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Добави">
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex min-h-16 flex-1 flex-col gap-2">
                {colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assignee={userById(data, t.assigneeId)}
                    dragging={dragId === t.id}
                    onClick={() => setOpenTask(t.id)}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  />
                ))}
                {colTasks.length === 0 && (
                  <button
                    onClick={() => setAddIn(col)}
                    className="rounded-lg border border-dashed border-[var(--border)] py-3 text-xs text-[var(--muted-2)] hover:border-[var(--border-strong)] hover:text-[var(--muted)] cursor-pointer"
                  >
                    + Добави задача
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <NewTaskModal open={addIn !== null} onClose={() => setAddIn(null)} projectId={projectId} defaultStatus={addIn ?? "todo"} />
      <TaskDrawer taskId={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}

function TaskCard({
  task,
  assignee,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  assignee?: { name: string; color: string };
  dragging: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const overdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 transition-all hover:border-[var(--border-strong)]",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{task.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={cn("flex items-center gap-1 text-xs", overdue ? "text-[var(--red)]" : "text-[var(--muted-2)]")}>
              <CalendarClock size={12} /> {formatDate(task.dueDate)}
            </span>
          )}
          {assignee && <Avatar name={assignee.name} color={assignee.color} size={22} />}
        </div>
      </div>
    </div>
  );
}
