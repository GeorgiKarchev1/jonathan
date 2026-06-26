"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore, companyById, userById } from "@/lib/store";
import { PageHeader, ProjectStatusBadge } from "@/components/shared";
import { AvatarGroup, Button, ProgressBar, EmptyState } from "@/components/ui";
import { NewProjectModal } from "@/components/modals";
import { formatRange } from "@/lib/utils";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/types";
import { FolderKanban, Plus, CalendarClock, ListChecks } from "@/components/icons";
import { SpotlightCard } from "@/components/motion";

const FILTERS: { key: ProjectStatus | "all"; label: string }[] = [
  { key: "all", label: "Всички" },
  { key: "active", label: "Активни" },
  { key: "planning", label: "Планиране" },
  { key: "on_hold", label: "Изчакване" },
  { key: "done", label: "Завършени" },
];

export default function ProjectsPage() {
  const { data } = useStore();
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [open, setOpen] = useState(false);

  const projects = data.projects.filter((p) => filter === "all" || p.status === filter);

  return (
    <div>
      <PageHeader
        title="Проекти"
        subtitle="Всички проекти, фирми и екип на едно място."
        icon={<FolderKanban size={20} />}
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Нов проект
          </Button>
        }
      />

      <div className="p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                filter === f.key
                  ? "bg-[var(--surface-3)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[var(--muted-2)]">
                {f.key === "all" ? data.projects.length : data.projects.filter((p) => p.status === f.key).length}
              </span>
            </button>
          ))}
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={22} />}
            title="Няма проекти тук"
            description="Създай първия си проект, за да започнеш да управляваш работата и екипа."
            action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} /> Нов проект</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const company = companyById(data, p.companyId);
              const members = p.memberIds.map((id) => userById(data, id)).filter(Boolean);
              const tasks = data.tasks.filter((t) => t.projectId === p.id);
              const done = tasks.filter((t) => t.status === "done").length;
              const progress = tasks.length ? done / tasks.length : 0;
              return (
                <SpotlightCard key={p.id} className="card flex h-full flex-col overflow-hidden rounded-[var(--radius)] hover:border-[var(--border-strong)]">
                <Link
                  href={`/projects/${p.id}`}
                  className="group flex h-full flex-col p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-semibold"
                        style={{ background: p.color }}>
                        {p.name[0]}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{p.name}</h3>
                        <p className="truncate text-xs text-[var(--muted)]">{company?.name ?? "Без фирма"}</p>
                      </div>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>

                  {p.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">{p.description}</p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1"><ListChecks size={13} /> {done}/{tasks.length} задачи</span>
                      <span>{Math.round(progress * 100)}%</span>
                    </div>
                    <ProgressBar value={progress} color={p.color} />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <AvatarGroup people={members.map((m) => ({ name: m!.name, color: m!.color }))} size={26} />
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-2)]">
                      <CalendarClock size={13} /> {formatRange(p.startDate, p.endDate)}
                    </span>
                  </div>
                </Link>
                </SpotlightCard>
              );
            })}
          </div>
        )}
      </div>

      <NewProjectModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
