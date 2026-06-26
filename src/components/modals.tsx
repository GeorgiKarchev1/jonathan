"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea, Avatar } from "./ui";
import { useStore } from "@/lib/store";
import type { ID, Priority, ProjectStatus, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addProject, currentUser } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [members, setMembers] = useState<ID[]>(currentUser ? [currentUser.id] : []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function reset() {
    setName(""); setDescription(""); setCompanyId(""); setStatus("planning");
    setMembers(currentUser ? [currentUser.id] : []); setStartDate(""); setEndDate("");
  }

  function submit() {
    if (!name.trim()) return;
    addProject({
      name: name.trim(),
      description: description.trim() || undefined,
      companyId: companyId || undefined,
      status,
      ownerId: currentUser?.id ?? "u_ivan",
      memberIds: members,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Нов проект"
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отказ</Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>Създай проект</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Име на проекта">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Нов уебсайт за Aurora" autoFocus />
        </Field>
        <Field label="Описание">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Накратко за какво е проектът…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Фирма">
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— без фирма —</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Статус">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              <option value="planning">Планиране</option>
              <option value="active">Активен</option>
              <option value="on_hold">Изчакване</option>
              <option value="done">Завършен</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Начало">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Краен срок">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Екип">
          <div className="flex flex-wrap gap-2">
            {data.users.map((u) => {
              const on = members.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setMembers((m) => (on ? m.filter((x) => x !== u.id) : [...m, u.id]))}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition-colors cursor-pointer",
                    on
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <Avatar name={u.name} color={u.color} size={20} />
                  {u.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

export function NewCompanyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCompany } = useStore();
  const [form, setForm] = useState({ name: "", industry: "", contactName: "", contactEmail: "", website: "", notes: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit() {
    if (!form.name.trim()) return;
    addCompany({
      name: form.name.trim(),
      industry: form.industry || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      website: form.website || undefined,
      notes: form.notes || undefined,
    });
    setForm({ name: "", industry: "", contactName: "", contactEmail: "", website: "", notes: "" });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Нова фирма"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отказ</Button>
          <Button variant="primary" onClick={submit} disabled={!form.name.trim()}>Запази</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Име на фирмата">
            <Input value={form.name} onChange={set("name")} placeholder="Aurora Foods" autoFocus />
          </Field>
          <Field label="Бранш">
            <Input value={form.industry} onChange={set("industry")} placeholder="Хранителна индустрия" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Лице за контакт">
            <Input value={form.contactName} onChange={set("contactName")} placeholder="Петър Иванов" />
          </Field>
          <Field label="Имейл за контакт">
            <Input type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="petar@firma.bg" />
          </Field>
        </div>
        <Field label="Уебсайт">
          <Input value={form.website} onChange={set("website")} placeholder="firma.bg" />
        </Field>
        <Field label="Бележки">
          <Textarea value={form.notes} onChange={set("notes")} placeholder="Важна информация за фирмата…" />
        </Field>
      </div>
    </Modal>
  );
}

export function NewTaskModal({
  open,
  onClose,
  projectId,
  defaultStatus = "todo",
}: {
  open: boolean;
  onClose: () => void;
  projectId?: ID;
  defaultStatus?: TaskStatus;
}) {
  const { data, addTask } = useStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pid, setPid] = useState(projectId ?? data.projects[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const selectedProject = data.projects.find((p) => p.id === pid);
  const assignable = selectedProject
    ? data.users.filter((u) => selectedProject.memberIds.includes(u.id))
    : data.users;

  function submit() {
    if (!title.trim() || !pid) return;
    addTask({
      projectId: pid,
      title: title.trim(),
      description: description.trim() || undefined,
      status: defaultStatus,
      priority,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
    });
    setTitle(""); setDescription(""); setPriority("medium"); setAssigneeId(""); setDueDate("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Нова задача"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отказ</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim() || !pid}>Добави задача</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Заглавие">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Какво трябва да се направи?" autoFocus />
        </Field>
        <Field label="Описание">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Детайли по задачата…" />
        </Field>
        {!projectId && (
          <Field label="Проект">
            <Select value={pid} onChange={(e) => { setPid(e.target.value); setAssigneeId(""); }}>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Приоритет">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Нисък</option>
              <option value="medium">Среден</option>
              <option value="high">Висок</option>
              <option value="urgent">Спешен</option>
            </Select>
          </Field>
          <Field label="Отговорник">
            <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">—</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Срок">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
