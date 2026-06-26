"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, SectionTitle } from "@/components/shared";
import { Avatar, Button, Field, Input, Badge } from "@/components/ui";
import { Settings, RotateCcw, Database, Sparkles, Check, AlertCircle } from "@/components/icons";

export default function SettingsPage() {
  const { data, currentUser, updateCurrentUser, switchUser, resetDemo } = useStore();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [title, setTitle] = useState(currentUser?.title ?? "");

  const supabaseOn = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div>
      <PageHeader title="Настройки" subtitle="Профил, екип и връзки." icon={<Settings size={20} />} />

      <div className="mx-auto max-w-3xl space-y-8 p-5 sm:p-8">
        {/* Profile */}
        <section className="card p-6">
          <SectionTitle className="mb-4">Профил</SectionTitle>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={name || currentUser?.name || "?"} color={currentUser?.color} size={56} />
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Име"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Длъжност"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Дизайнер" /></Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => updateCurrentUser({ name: name.trim(), title: title.trim() })} disabled={!name.trim()}>
              <Check size={15} /> Запази
            </Button>
          </div>
        </section>

        {/* Team */}
        <section className="card p-6">
          <SectionTitle className="mb-4">Екип ({data.users.length})</SectionTitle>
          <div className="space-y-1">
            {data.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-2)]">
                <Avatar name={u.name} color={u.color} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-[var(--muted-2)]">{u.title ?? u.email}</p>
                </div>
                <Badge color={u.role === "owner" ? "var(--accent)" : undefined}>{roleLabel(u.role)}</Badge>
                {u.id === currentUser?.id ? (
                  <span className="w-20 text-right text-xs text-[var(--green)]">текущ</span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => switchUser(u.id)}>Влез като</Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Connections */}
        <section className="card p-6">
          <SectionTitle className="mb-4">Връзки</SectionTitle>
          <div className="space-y-3">
            <ConnectionRow
              icon={<Database size={18} />}
              title="Supabase (база данни)"
              on={supabaseOn}
              onText="Свързан — данните се пазят в облака"
              offText="Демо режим — данните се пазят локално в браузъра"
            />
            <ConnectionRow
              icon={<Sparkles size={18} />}
              title="Claude AI"
              on={false}
              onText="Свързан"
              offText="Демо асистент — добави ANTHROPIC_API_KEY за реален AI"
            />
          </div>
          <p className="mt-4 text-xs text-[var(--muted-2)]">
            Виж <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">README.md</code> и{" "}
            <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">supabase/schema.sql</code> за включване на облака.
          </p>
        </section>

        {/* Danger */}
        <section className="card border-[rgba(239,68,68,0.3)] p-6">
          <SectionTitle className="mb-1">Изчисти данните</SectionTitle>
          <p className="mb-4 text-sm text-[var(--muted)]">Изтрива всички проекти, фирми, задачи, агенти и заявки. Остава само твоят акаунт. Това действие е необратимо.</p>
          <Button variant="danger" onClick={() => { if (confirm("Изтриване на всички данни?")) resetDemo(); }}>
            <RotateCcw size={15} /> Изчисти всичко
          </Button>
        </section>
      </div>
    </div>
  );
}

function ConnectionRow({ icon, title, on, onText, offText }: {
  icon: React.ReactNode; title: string; on: boolean; onText: string; offText: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-3)] text-[var(--muted)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-[var(--muted)]">{on ? onText : offText}</p>
      </div>
      <Badge color={on ? "var(--green)" : "var(--amber)"}>
        {on ? <Check size={12} /> : <AlertCircle size={12} />} {on ? "Активен" : "Демо"}
      </Badge>
    </div>
  );
}

function roleLabel(r: string) {
  return ({ owner: "Собственик", admin: "Админ", member: "Член" } as Record<string, string>)[r] ?? r;
}
