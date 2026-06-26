"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useStore, companyById, userById } from "@/lib/store";
import { TaskBoard } from "@/components/TaskBoard";
import { Attachments } from "@/components/Attachments";
import { ProjectStatusBadge, SectionTitle } from "@/components/shared";
import { Avatar, Button, ProgressBar, Select, EmptyState } from "@/components/ui";
import { formatRange, daysBetween, cn } from "@/lib/utils";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/types";
import {
  ArrowLeft, Sparkles, Building2, CalendarClock, Users, ListChecks,
  Trash2, LayoutGrid, Paperclip, FileText,
} from "@/components/icons";

type Tab = "overview" | "tasks" | "files";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, updateProject, deleteProject, addConversation } = useStore();
  const [tab, setTab] = useState<Tab>("overview");

  const project = data.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="p-8">
        <EmptyState icon={<FileText size={22} />} title="Проектът не е намерен"
          action={<Link href="/projects"><Button variant="secondary">Към проектите</Button></Link>} />
      </div>
    );
  }

  const company = companyById(data, project.companyId);
  const members = project.memberIds.map((mid) => userById(data, mid)).filter(Boolean);
  const owner = userById(data, project.ownerId);
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length ? done / tasks.length : 0;
  const attachCount = data.attachments.filter((a) => a.projectId === project.id).length;
  const totalHours = tasks.reduce((s, t) => s + t.timeLogs.reduce((x, l) => x + (l.hours ?? 0), 0), 0);

  function chatAboutProject() {
    const conv = addConversation({ title: `Чат: ${project!.name}`, projectId: project!.id });
    router.push(`/chat?c=${conv.id}`);
  }

  const TABS: { key: Tab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { key: "overview", label: "Преглед", icon: FileText },
    { key: "tasks", label: "Задачи", icon: LayoutGrid, badge: tasks.length },
    { key: "files", label: "Файлове", icon: Paperclip, badge: attachCount },
  ];

  return (
    <div>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-5 py-5 sm:px-8">
        <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Проекти
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-semibold text-white" style={{ background: project.color }}>
              {project.name[0]}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              {company && (
                <Link href={`/companies`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                  <Building2 size={14} /> {company.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={project.status}
              onChange={(e) => updateProject(project.id, { status: e.target.value as ProjectStatus })}
              className="w-40"
            >
              {Object.entries(PROJECT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
            <Button variant="primary" onClick={chatAboutProject}><Sparkles size={16} /> Чат за проекта</Button>
            <button
              onClick={() => { if (confirm("Изтриване на проекта и всичките му задачи?")) { deleteProject(project.id); router.push("/projects"); } }}
              className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)] cursor-pointer"
              aria-label="Изтрий проект"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1">
          {TABS.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer",
                tab === key ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              )}
            >
              <Icon size={16} /> {label}
              {badge != null && badge > 0 && <span className="text-[var(--muted-2)]">{badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-8">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div>
                <SectionTitle className="mb-2">Описание</SectionTitle>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {project.description || "Няма описание."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={<ListChecks size={15} />} label="Задачи" value={`${done}/${tasks.length}`} />
                <Stat icon={<Users size={15} />} label="Екип" value={members.length} />
                <Stat icon={<CalendarClock size={15} />} label="Дни" value={daysBetween(project.startDate, project.endDate) ?? "—"} />
                <Stat icon={<Sparkles size={15} />} label="Часове" value={totalHours || "—"} />
              </div>

              <div className="card p-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Прогрес</span>
                  <span className="text-[var(--muted)]">{Math.round(progress * 100)}%</span>
                </div>
                <ProgressBar value={progress} color={project.color} />
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {(["todo", "in_progress", "review", "done"] as const).map((s) => (
                    <div key={s} className="rounded-lg bg-[var(--surface-2)] py-2">
                      <p className="text-lg font-semibold">{tasks.filter((t) => t.status === s).length}</p>
                      <p className="text-xs text-[var(--muted-2)]">{PROJECT_STATUS_LABEL(s)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side: team + period */}
            <div className="space-y-6">
              <div className="card p-5">
                <SectionTitle className="mb-3">Период</SectionTitle>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarClock size={16} className="text-[var(--accent)]" />
                  {formatRange(project.startDate, project.endDate)}
                </div>
              </div>

              <div className="card p-5">
                <SectionTitle className="mb-3">Екип</SectionTitle>
                <div className="space-y-3">
                  {owner && (
                    <div className="flex items-center gap-3">
                      <Avatar name={owner.name} color={owner.color} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{owner.name}</p>
                        <p className="text-xs text-[var(--accent)]">Ръководител</p>
                      </div>
                    </div>
                  )}
                  {members.filter((m) => m!.id !== owner?.id).map((m) => (
                    <div key={m!.id} className="flex items-center gap-3">
                      <Avatar name={m!.name} color={m!.color} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m!.name}</p>
                        <p className="truncate text-xs text-[var(--muted-2)]">{m!.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "tasks" && <TaskBoard projectId={project.id} />}
        {tab === "files" && <Attachments projectId={project.id} />}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">{icon} {label}</div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function PROJECT_STATUS_LABEL(s: "todo" | "in_progress" | "review" | "done") {
  return { todo: "За правене", in_progress: "В процес", review: "Преглед", done: "Готово" }[s];
}
