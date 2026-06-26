"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, companyById } from "@/lib/store";
import { PageHeader } from "@/components/shared";
import { AgentModal } from "@/components/AgentModal";
import { Badge, Button, Dot, EmptyState, Select } from "@/components/ui";
import { AGENT_STATUS, type Agent } from "@/lib/types";
import {
  Robot, Plus, Pencil, Trash2, Sparkles, Cpu, Building2, FolderKanban, Play, Pause,
} from "@/components/icons";

export default function AgentsPage() {
  const { data, deleteAgent, updateAgent, addConversation } = useStore();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [filter, setFilter] = useState("");

  const agents = useMemo(() => {
    const list = filter ? data.agents.filter((a) => a.companyId === filter) : data.agents;
    return [...list].sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));
  }, [data.agents, filter]);

  function openNew() { setEditing(null); setModalOpen(true); }
  function openEdit(a: Agent) { setEditing(a); setModalOpen(true); }

  function chatWith(a: Agent) {
    const conv = addConversation({ title: `Чат с ${a.name}`, agentId: a.id, projectId: a.projectId });
    router.push(`/chat?c=${conv.id}`);
  }

  return (
    <div>
      <PageHeader
        title="Агенти"
        subtitle="Създавай и менажирай AI агенти със собствена личност и обхват."
        icon={<Robot size={20} />}
        actions={
          <>
            {data.companies.length > 0 && (
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="hidden w-44 sm:block">
                <option value="">Всички клиенти</option>
                {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <Button variant="primary" onClick={openNew}><Plus size={16} /> Нов агент</Button>
          </>
        }
      />

      <div className="p-5 sm:p-8">
        {agents.length === 0 ? (
          <EmptyState
            icon={<Robot size={22} />}
            title={filter ? "Няма агенти за този клиент" : "Все още няма агенти"}
            description="Създай агент, дай му инструкции и обхват, и започни да работиш с него в чата."
            action={<Button variant="primary" onClick={openNew}><Plus size={16} /> Нов агент</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a) => {
              const company = companyById(data, a.companyId);
              const project = data.projects.find((p) => p.id === a.projectId);
              const status = AGENT_STATUS[a.status];
              return (
                <div key={a.id} className="card group flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ background: a.color, opacity: a.status === "paused" ? 0.5 : 1 }}
                      >
                        <Robot size={22} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{a.name}</h3>
                        <Badge color={status.color}><Dot color={status.color} /> {status.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Редактирай"><Pencil size={15} /></button>
                      <button
                        onClick={() => updateAgent(a.id, { status: a.status === "active" ? "paused" : "active" })}
                        className="rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer"
                        aria-label={a.status === "active" ? "Пауза" : "Активирай"}
                      >
                        {a.status === "active" ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button onClick={() => { if (confirm(`Изтриване на агент „${a.name}"?`)) deleteAgent(a.id); }} className="rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)] cursor-pointer" aria-label="Изтрий"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {a.description && <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">{a.description}</p>}

                  {a.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.skills.map((s) => (
                        <span key={s} className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--muted)]">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-1.5 text-xs text-[var(--muted)]">
                    <p className="flex items-center gap-2"><Cpu size={13} /> {a.model}</p>
                    {company && <p className="flex items-center gap-2"><Building2 size={13} /> {company.name}</p>}
                    {project && <p className="flex items-center gap-2"><FolderKanban size={13} /> {project.name}</p>}
                  </div>

                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <Button variant="secondary" onClick={() => chatWith(a)} className="w-full"><Sparkles size={15} /> Чат с агента</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AgentModal open={modalOpen} onClose={() => setModalOpen(false)} agent={editing} />
    </div>
  );
}
