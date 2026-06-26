"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore, companyById, userById } from "@/lib/store";
import { PageHeader, StatCard, ProjectStatusBadge, SectionTitle, PriorityBadge } from "@/components/shared";
import { Avatar, AvatarGroup, Button, ProgressBar } from "@/components/ui";
import { NewProjectModal } from "@/components/modals";
import { formatRange, formatDate } from "@/lib/utils";
import { TASK_STATUS } from "@/lib/types";
import {
  FolderKanban, CheckSquare, Building2, Sparkles, Plus, ArrowRight, CalendarClock,
} from "@/components/icons";
import { Reveal } from "@/components/motion";

export default function DashboardPage() {
  const { data, currentUser } = useStore();
  const [newProject, setNewProject] = useState(false);

  const activeProjects = data.projects.filter((p) => p.status === "active");
  const openTasks = data.tasks.filter((t) => t.status !== "done");
  const myTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.assigneeId === currentUser?.id && t.status !== "done")
        .sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))
        .slice(0, 6),
    [data.tasks, currentUser?.id]
  );

  function projectProgress(projectId: string) {
    const tasks = data.tasks.filter((t) => t.projectId === projectId);
    if (!tasks.length) return 0;
    return tasks.filter((t) => t.status === "done").length / tasks.length;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Добро утро" : hour < 18 ? "Добър ден" : "Добър вечер";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${currentUser?.name.split(" ")[0]}`}
        subtitle="Ето какво се случва в работното ти пространство днес."
        actions={
          <Button variant="primary" onClick={() => setNewProject(true)}>
            <Plus size={16} /> Нов проект
          </Button>
        }
      />

      <div className="space-y-8 p-5 sm:p-8">
        {/* Stats */}
        <Reveal delay={0.04}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Активни проекти" value={activeProjects.length} icon={<FolderKanban size={16} />} />
            <StatCard label="Отворени задачи" value={openTasks.length} icon={<CheckSquare size={16} />} />
            <StatCard label="Фирми" value={data.companies.length} icon={<Building2 size={16} />} />
            <StatCard label="Членове на екипа" value={data.users.length} icon={<Sparkles size={16} />} />
          </div>
        </Reveal>

        {/* AI banner */}
        <Reveal delay={0.12}>
        <Link
          href="/chat"
          className="gradient-border spotlight group relative flex items-center gap-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-5 transition-colors hover:border-[var(--border-strong)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-black">
            <Sparkles size={22} />
          </span>
          <div className="flex-1">
            <h3 className="font-semibold">Питай AI асистента</h3>
            <p className="text-sm text-[var(--muted)]">
              „Какво да свърша днес?" или избери задача и кажи „изпълни я".
            </p>
          </div>
          <ArrowRight size={20} className="text-[var(--muted)] transition-transform group-hover:translate-x-1" />
        </Link>
        </Reveal>

        <Reveal delay={0.2}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Active projects */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Активни проекти</SectionTitle>
              <Link href="/projects" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                Всички →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeProjects.length === 0 && (
                <p className="text-sm text-[var(--muted)]">Няма активни проекти.</p>
              )}
              {activeProjects.map((p) => {
                const company = companyById(data, p.companyId);
                const members = p.memberIds.map((id) => userById(data, id)).filter(Boolean);
                const progress = projectProgress(p.id);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="card group p-4 transition-colors hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
                        <div className="min-w-0">
                          <h4 className="truncate font-medium">{p.name}</h4>
                          {company && <p className="truncate text-xs text-[var(--muted)]">{company.name}</p>}
                        </div>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>Прогрес</span>
                        <span>{Math.round(progress * 100)}%</span>
                      </div>
                      <ProgressBar value={progress} color={p.color} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <AvatarGroup people={members.map((m) => ({ name: m!.name, color: m!.color }))} size={24} />
                      <span className="flex items-center gap-1 text-xs text-[var(--muted-2)]">
                        <CalendarClock size={13} /> {formatRange(p.startDate, p.endDate)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* My tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Моите задачи</SectionTitle>
              <Link href="/tasks" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                Всички →
              </Link>
            </div>
            <div className="card divide-y divide-[var(--border)]">
              {myTasks.length === 0 && (
                <p className="p-4 text-sm text-[var(--muted)]">Нямаш отворени задачи.</p>
              )}
              {myTasks.map((t) => {
                const project = data.projects.find((p) => p.id === t.projectId);
                return (
                  <Link key={t.id} href={`/projects/${t.projectId}`} className="block p-3.5 transition-colors hover:bg-[var(--surface-2)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TASK_STATUS[t.status].color }} />
                      <span className="flex-1 truncate text-sm font-medium">{t.title}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 pl-4 text-xs text-[var(--muted-2)]">
                      <span className="truncate">{project?.name}</span>
                      {t.dueDate && <span>· до {formatDate(t.dueDate)}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        </Reveal>
      </div>

      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} />
    </div>
  );
}
