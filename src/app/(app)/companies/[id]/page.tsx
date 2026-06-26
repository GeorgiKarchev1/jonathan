"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { FileExplorer } from "@/components/FileExplorer";
import { AgentModal } from "@/components/AgentModal";
import { ProjectStatusBadge, SectionTitle } from "@/components/shared";
import { Badge, Button, Dot, EmptyState } from "@/components/ui";
import { NewProjectModal } from "@/components/modals";
import { initials } from "@/lib/utils";
import { AGENT_STATUS, type Agent } from "@/lib/types";
import {
  ArrowLeft, Building2, Mail, Globe, User, FolderKanban, Paperclip, Robot,
  FileText, Plus, Pencil, Trash2, Sparkles, Cpu, Play, Pause,
} from "@/components/icons";

type Tab = "overview" | "files" | "agents";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, deleteCompany, deleteAgent, updateAgent, addConversation } = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [projectOpen, setProjectOpen] = useState(false);
  const [agentModal, setAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const company = data.companies.find((c) => c.id === id);
  if (!company) {
    return (
      <div className="p-8">
        <EmptyState icon={<Building2 size={22} />} title="Фирмата не е намерена"
          action={<Link href="/companies"><Button variant="secondary">Към фирмите</Button></Link>} />
      </div>
    );
  }

  const projects = data.projects.filter((p) => p.companyId === company.id);
  const agents = data.agents.filter((a) => a.companyId === company.id);
  const files = data.attachments.filter((a) => a.companyId === company.id);

  function chatWith(a: Agent) {
    const conv = addConversation({ title: `Чат с ${a.name}`, agentId: a.id, projectId: a.projectId });
    router.push(`/chat?c=${conv.id}`);
  }

  const TABS: { key: Tab; label: string; icon: typeof FileText; badge?: number }[] = [
    { key: "overview", label: "Преглед", icon: FileText },
    { key: "files", label: "Файлове", icon: Paperclip, badge: files.length },
    { key: "agents", label: "Агенти", icon: Robot, badge: agents.length },
  ];

  return (
    <div>
      <div className="border-b border-[var(--border)] px-5 py-5 sm:px-8">
        <Link href="/companies" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Фирми
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--surface-3)] to-[var(--surface-2)] text-sm font-semibold ring-1 ring-[var(--border)]">
              {initials(company.name)}
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
              {company.industry && <p className="mt-1 text-sm text-[var(--muted)]">{company.industry}</p>}
            </div>
          </div>
          <button
            onClick={() => { if (confirm(`Изтриване на „${company.name}"? Проектите остават без клиент.`)) { deleteCompany(company.id); router.push("/companies"); } }}
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)] cursor-pointer"
            aria-label="Изтрий фирма"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-5 flex gap-1">
          {TABS.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                tab === key ? "bg-[var(--surface-3)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              }`}
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
              <div className="flex items-center justify-between">
                <SectionTitle>Проекти</SectionTitle>
                <Button variant="outline" size="sm" onClick={() => setProjectOpen(true)}><Plus size={14} /> Нов проект</Button>
              </div>
              {projects.length === 0 ? (
                <EmptyState icon={<FolderKanban size={22} />} title="Няма проекти за този клиент"
                  action={<Button variant="primary" onClick={() => setProjectOpen(true)}><Plus size={16} /> Нов проект</Button>} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map((p) => {
                    const tasks = data.tasks.filter((t) => t.projectId === p.id);
                    const done = tasks.filter((t) => t.status === "done").length;
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="card group p-4 transition-colors hover:border-[var(--border-strong)]">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ background: p.color }}>{p.name[0]}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-[var(--muted-2)]">{done}/{tasks.length} задачи</p>
                          </div>
                        </div>
                        <div className="mt-3"><ProjectStatusBadge status={p.status} /></div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <SectionTitle className="mb-3">Контакт</SectionTitle>
                <div className="space-y-2 text-sm">
                  {company.contactName && <p className="flex items-center gap-2 text-[var(--muted)]"><User size={14} /> {company.contactName}</p>}
                  {company.contactEmail && <a href={`mailto:${company.contactEmail}`} className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)]"><Mail size={14} /> {company.contactEmail}</a>}
                  {company.website && <a href={`https://${company.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)]"><Globe size={14} /> {company.website}</a>}
                  {!company.contactName && !company.contactEmail && !company.website && <p className="text-[var(--muted-2)]">Няма данни за контакт.</p>}
                </div>
              </div>
              {company.notes && (
                <div className="card p-5">
                  <SectionTitle className="mb-3">Бележки</SectionTitle>
                  <p className="text-sm text-[var(--muted)]">{company.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Mini label="Проекти" value={projects.length} icon={<FolderKanban size={14} />} />
                <Mini label="Файлове" value={files.length} icon={<Paperclip size={14} />} />
                <Mini label="Агенти" value={agents.length} icon={<Robot size={14} />} />
              </div>
            </div>
          </div>
        )}

        {tab === "files" && <FileExplorer lockCompanyId={company.id} />}

        {tab === "agents" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Агенти за {company.name}</SectionTitle>
              <Button variant="outline" size="sm" onClick={() => { setEditingAgent(null); setAgentModal(true); }}><Plus size={14} /> Нов агент</Button>
            </div>
            {agents.length === 0 ? (
              <EmptyState icon={<Robot size={22} />} title="Няма агенти за този клиент"
                description="Създай агент, насочен към този клиент, за по-точни отговори."
                action={<Button variant="primary" onClick={() => { setEditingAgent(null); setAgentModal(true); }}><Plus size={16} /> Нов агент</Button>} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {agents.map((a) => {
                  const status = AGENT_STATUS[a.status];
                  return (
                    <div key={a.id} className="card group flex flex-col p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: a.color, opacity: a.status === "paused" ? 0.5 : 1 }}><Robot size={22} /></span>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{a.name}</h3>
                            <Badge color={status.color}><Dot color={status.color} /> {status.label}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => { setEditingAgent(a); setAgentModal(true); }} className="rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer"><Pencil size={15} /></button>
                          <button onClick={() => updateAgent(a.id, { status: a.status === "active" ? "paused" : "active" })} className="rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer">{a.status === "active" ? <Pause size={15} /> : <Play size={15} />}</button>
                          <button onClick={() => { if (confirm(`Изтриване на агент „${a.name}"?`)) deleteAgent(a.id); }} className="rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)] cursor-pointer"><Trash2 size={15} /></button>
                        </div>
                      </div>
                      {a.description && <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">{a.description}</p>}
                      <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]"><Cpu size={13} /> {a.model}</p>
                      <div className="mt-4 border-t border-[var(--border)] pt-4">
                        <Button variant="secondary" onClick={() => chatWith(a)} className="w-full"><Sparkles size={15} /> Чат с агента</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <NewProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} />
      <AgentModal open={agentModal} onClose={() => setAgentModal(false)} agent={editingAgent} />
    </div>
  );
}

function Mini({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">{icon} {label}</div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
