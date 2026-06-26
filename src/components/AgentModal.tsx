"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";
import { cn } from "@/lib/utils";
import { AGENT_MODELS, AGENT_TEMPLATES, type Agent, type AgentStatus } from "@/lib/types";
import { Plus, Robot, X } from "@/components/icons";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

const empty = {
  name: "",
  description: "",
  instructions: "",
  model: AGENT_MODELS[0] as string,
  color: COLORS[0],
  skills: [] as string[],
  companyId: "",
  projectId: "",
  status: "active" as AgentStatus,
};

export function AgentModal({
  open,
  onClose,
  agent,
}: {
  open: boolean;
  onClose: () => void;
  agent?: Agent | null;
}) {
  const { data, addAgent, updateAgent } = useStore();
  const [form, setForm] = useState({ ...empty });
  const [skillInput, setSkillInput] = useState("");

  const editing = !!agent;

  // load the agent being edited (or reset) whenever the modal opens
  useEffect(() => {
    if (!open) return;
    if (agent) {
      setForm({
        name: agent.name,
        description: agent.description ?? "",
        instructions: agent.instructions ?? "",
        model: agent.model,
        color: agent.color,
        skills: agent.skills ?? [],
        companyId: agent.companyId ?? "",
        projectId: agent.projectId ?? "",
        status: agent.status,
      });
    } else {
      setForm({ ...empty });
    }
    setSkillInput("");
  }, [open, agent]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // projects available for the chosen client (or all if none chosen)
  const projects = form.companyId
    ? data.projects.filter((p) => p.companyId === form.companyId)
    : data.projects;

  function addSkill(raw: string) {
    const s = raw.trim();
    if (!s || form.skills.includes(s)) return;
    set("skills", [...form.skills, s]);
    setSkillInput("");
  }

  function applyTemplate(t: (typeof AGENT_TEMPLATES)[number]) {
    setForm((f) => ({
      ...f,
      name: f.name || t.name,
      description: t.description,
      instructions: t.instructions,
      skills: t.skills,
      color: t.color,
    }));
  }

  function submit() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      instructions: form.instructions.trim() || undefined,
      model: form.model,
      color: form.color,
      skills: form.skills,
      companyId: form.companyId || undefined,
      projectId: form.projectId || undefined,
      status: form.status,
    };
    if (editing && agent) updateAgent(agent.id, payload);
    else addAgent(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={580}
      title={editing ? "Редакция на агент" : "Нов агент"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отказ</Button>
          <Button variant="primary" onClick={submit} disabled={!form.name.trim()}>
            {editing ? "Запази" : "Създай агент"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!editing && (
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">Шаблон (по избор)</span>
            <div className="flex flex-wrap gap-1.5">
              {AGENT_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: form.color }}
          >
            <Robot size={22} />
          </span>
          <div className="flex-1">
            <Field label="Име на агента">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="напр. Атлас" autoFocus />
            </Field>
          </div>
        </div>

        <Field label="Кратко описание">
          <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="С какво помага този агент?" />
        </Field>

        <Field label="Инструкции (системен промпт)" hint="Личността и стилът, с които агентът отговаря.">
          <Textarea
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="Ти си… Отговаряй кратко и конкретно на български."
            className="min-h-24"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Модел">
            <Select value={form.model} onChange={(e) => set("model", e.target.value)}>
              {AGENT_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Статус">
            <Select value={form.status} onChange={(e) => set("status", e.target.value as AgentStatus)}>
              <option value="active">Активен</option>
              <option value="paused">На пауза</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Клиент (обхват)">
            <Select value={form.companyId} onChange={(e) => { set("companyId", e.target.value); set("projectId", ""); }}>
              <option value="">— всички —</option>
              {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Проект (обхват)">
            <Select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">— всички —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Умения">
          <div className="space-y-2">
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">
                    {s}
                    <button type="button" onClick={() => set("skills", form.skills.filter((x) => x !== s))} className="text-[var(--muted-2)] hover:text-[var(--red)] cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                placeholder="напр. Писане, после Enter"
              />
              <Button variant="outline" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} className="shrink-0"><Plus size={15} /></Button>
            </div>
          </div>
        </Field>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">Цвят</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                className={cn(
                  "h-7 w-7 rounded-full ring-2 transition-transform cursor-pointer hover:scale-110",
                  form.color === c ? "ring-[var(--foreground)]" : "ring-transparent"
                )}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
