"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Select, EmptyState } from "@/components/ui";
import { NewTaskModal } from "@/components/modals";
import { TaskDrawer } from "@/components/TaskDrawer";
import { formatDate, cn } from "@/lib/utils";
import { TASK_STATUS, PRIORITY, type ID, type Task, type TaskStatus, type Priority } from "@/lib/types";
import {
  CheckSquare, Plus, CalendarClock, ListView, Columns, ListChecks, Flag,
  Check, Trash2,
} from "@/components/icons";

type View = "list" | "board" | "priority";
const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];

export default function TasksPage() {
  const { data, currentUser, updateTask } = useStore();
  const [view, setView] = useState<View>("list");
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [projectFilter, setProjectFilter] = useState<ID | "all">("all");
  const [openTask, setOpenTask] = useState<ID | null>(null);
  const [adding, setAdding] = useState<{ status?: TaskStatus } | null>(null);

  const tasks = useMemo(() => {
    return data.tasks
      .filter((t) => (scope === "mine" ? t.assigneeId === currentUser?.id : true))
      .filter((t) => projectFilter === "all" || t.projectId === projectFilter);
  }, [data.tasks, scope, projectFilter, currentUser?.id]);

  const done = tasks.filter((t) => t.status === "done").length;

  function toggleDone(t: Task) {
    updateTask(t.id, { status: t.status === "done" ? "todo" : "done" });
  }

  const VIEWS: { key: View; icon: typeof ListView; label: string }[] = [
    { key: "list", icon: ListView, label: "Списък" },
    { key: "board", icon: Columns, label: "Дъска" },
    { key: "priority", icon: ListChecks, label: "Приоритет" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 text-sm">
          <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Justin</span>
          <span className="text-[var(--muted-2)]">/</span>
          <span className="font-semibold">задачи</span>
        </span>

        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          {VIEWS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              title={label}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors cursor-pointer",
                view === key
                  ? "bg-[var(--surface-3)] text-[var(--foreground)] ring-1 ring-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon size={17} />
              {key === "priority" && <span className="hidden sm:inline">Приоритет</span>}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value={scope} onChange={(e) => setScope(e.target.value as "mine" | "all")} className="hidden w-28 sm:block">
            <option value="all">Всички</option>
            <option value="mine">Моите</option>
          </Select>
          <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value as ID | "all")} className="hidden w-44 sm:block">
            <option value="all">Всички проекти</option>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">{done} / {tasks.length}</span>
          <Button variant="primary" onClick={() => setAdding({})}><Plus size={16} /> Нова</Button>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">
        {view === "list" && (
          <ListBody tasks={tasks} data={data} onOpen={setOpenTask} onToggle={toggleDone} onAdd={() => setAdding({})} />
        )}
        {view === "priority" && (
          <PriorityBody tasks={tasks} data={data} onOpen={setOpenTask} onToggle={toggleDone} onAdd={() => setAdding({})} />
        )}
        {view === "board" && (
          <Board tasks={tasks} onOpen={setOpenTask} onAddIn={(status) => setAdding({ status })} />
        )}
      </div>

      <NewTaskModal open={adding !== null} onClose={() => setAdding(null)} defaultStatus={adding?.status ?? "todo"} />
      <TaskDrawer taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

// ---------------- List ----------------
function ListBody({
  tasks, data, onOpen, onToggle, onAdd,
}: {
  tasks: Task[];
  data: ReturnType<typeof useStore>["data"];
  onOpen: (id: ID) => void;
  onToggle: (t: Task) => void;
  onAdd: () => void;
}) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => {
      const o = { urgent: 0, high: 1, medium: 2, low: 3 };
      return o[a.priority] - o[b.priority] || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9");
    }),
    [tasks]
  );

  if (sorted.length === 0) {
    return (
      <div className="p-6 sm:p-8">
        <EmptyState icon={<CheckSquare size={22} />} title="Няма задачи"
          action={<Button variant="primary" onClick={onAdd}><Plus size={16} /> Нова задача</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-2.5 p-4 sm:p-6">
      {sorted.map((t) => <TaskRow key={t.id} task={t} project={data.projects.find((p) => p.id === t.projectId)} onOpen={onOpen} onToggle={onToggle} />)}
    </div>
  );
}

// ---------------- Priority (grouped) ----------------
function PriorityBody({
  tasks, data, onOpen, onToggle, onAdd,
}: {
  tasks: Task[];
  data: ReturnType<typeof useStore>["data"];
  onOpen: (id: ID) => void;
  onToggle: (t: Task) => void;
  onAdd: () => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="p-6 sm:p-8">
        <EmptyState icon={<CheckSquare size={22} />} title="Няма задачи"
          action={<Button variant="primary" onClick={onAdd}><Plus size={16} /> Нова задача</Button>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      {PRIORITY_ORDER.map((p) => {
        const group = tasks.filter((t) => t.priority === p);
        if (group.length === 0) return null;
        return (
          <div key={p}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Flag size={14} weight="fill" style={{ color: PRIORITY[p].color }} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{PRIORITY[p].label}</span>
              <span className="text-xs text-[var(--muted-2)]">{group.length}</span>
            </div>
            <div className="space-y-2.5">
              {group.map((t) => <TaskRow key={t.id} task={t} project={data.projects.find((x) => x.id === t.projectId)} onOpen={onOpen} onToggle={onToggle} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task, project, onOpen, onToggle,
}: {
  task: Task;
  project?: { name: string; color: string };
  onOpen: (id: ID) => void;
  onToggle: (t: Task) => void;
}) {
  const overdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
  const done = task.status === "done";
  return (
    <div
      onClick={() => onOpen(task.id)}
      className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--border-strong)]"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
          done ? "border-[var(--green)] bg-[var(--green)] text-black" : "border-[var(--border-strong)] hover:border-[var(--accent)]"
        )}
        aria-label="Готово"
      >
        {done && <Check size={13} weight="bold" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", done && "text-[var(--muted)] line-through")}>{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted-2)]">
          {project && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.color }} /> {project.name}
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1 italic", overdue && "text-[var(--red)]")}>
            <CalendarClock size={12} /> {overdue ? "просрочена" : task.dueDate ? formatDate(task.dueDate) : "без срок"}
          </span>
        </div>
      </div>
      <Flag size={17} weight="fill" style={{ color: PRIORITY[task.priority].color }} className="shrink-0 opacity-80" />
    </div>
  );
}

// ---------------- Board ----------------
function Board({
  tasks, onOpen, onAddIn,
}: {
  tasks: Task[];
  onOpen: (id: ID) => void;
  onAddIn: (status: TaskStatus) => void;
}) {
  const { data, moveTask, updateTask, addBoardColumn, deleteBoardColumn } = useStore();
  const [dragId, setDragId] = useState<ID | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const customIds = useMemo(() => new Set(data.boardColumns.map((c) => c.id)), [data.boardColumns]);

  const inCustom = (t: Task) => t.columnId && customIds.has(t.columnId);
  const baseTasks = (status: TaskStatus) => tasks.filter((t) => t.status === status && !inCustom(t)).sort((a, b) => a.order - b.order);
  const customTasks = (colId: ID) => tasks.filter((t) => t.columnId === colId).sort((a, b) => a.order - b.order);

  const baseCols = (Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => ({
    key: s, name: TASK_STATUS[s].label, color: TASK_STATUS[s].color,
    items: baseTasks(s), drop: () => dragId && moveTask(dragId, s), onAdd: () => onAddIn(s),
  }));
  const extraCols = data.boardColumns.map((c) => ({
    key: c.id, name: c.name, color: c.color,
    items: customTasks(c.id), drop: () => dragId && updateTask(dragId, { columnId: c.id }),
    onAdd: () => onAddIn("todo"), custom: c.id,
  }));
  const columns = [...baseCols, ...extraCols];

  function addColumn() {
    const name = prompt("Име на новата колона:");
    if (name?.trim()) addBoardColumn(name.trim());
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4 sm:p-6">
      {columns.map((col) => (
        <div
          key={col.key}
          onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
          onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
          onDrop={() => { col.drop(); setDragId(null); setOver(null); }}
          className={cn(
            "flex w-[300px] shrink-0 flex-col rounded-2xl border bg-[var(--surface)] transition-colors",
            over === col.key ? "border-[var(--accent)]" : "border-[var(--border)]"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
              {col.name}
              <span className="text-[var(--muted-2)]">{col.items.length}</span>
            </span>
            {"custom" in col && col.custom ? (
              <button onClick={() => deleteBoardColumn(col.custom!)} className="text-[var(--muted-2)] hover:text-[var(--red)] cursor-pointer" aria-label="Изтрий колона"><Trash2 size={15} /></button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">
            {col.items.map((t) => (
              <BoardCard
                key={t.id} task={t} project={data.projects.find((p) => p.id === t.projectId)}
                dragging={dragId === t.id}
                onClick={() => onOpen(t.id)}
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => { setDragId(null); setOver(null); }}
              />
            ))}
            {col.items.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-2)]">
                Пусни задачи тук
              </div>
            )}
            <button onClick={col.onAdd} className="mt-1 rounded-lg px-2 py-2 text-left text-sm text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--muted)] cursor-pointer">
              + Добави задача
            </button>
          </div>
        </div>
      ))}

      {/* Add a new column */}
      <button
        onClick={addColumn}
        className="flex w-[300px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-2)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--muted)] cursor-pointer"
      >
        <Plus size={16} className="mr-1.5" /> Добави колона
      </button>
    </div>
  );
}

function BoardCard({
  task, project, dragging, onClick, onDragStart, onDragEnd,
}: {
  task: Task;
  project?: { name: string; color: string };
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
        "group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 transition-all hover:border-[var(--border-strong)]",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <Flag size={15} weight="fill" style={{ color: PRIORITY[task.priority].color }} className="mt-0.5 shrink-0 opacity-80" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted-2)]">
        {project && <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: project.color }} /> {project.name}</span>}
        <span className={cn("inline-flex items-center gap-1 italic", overdue && "text-[var(--red)]")}>
          <CalendarClock size={11} /> {overdue ? "просрочена" : task.dueDate ? formatDate(task.dueDate) : "без срок"}
        </span>
      </div>
    </div>
  );
}
