"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/shared";
import { Button, EmptyState, Badge } from "@/components/ui";
import { NewCompanyModal } from "@/components/modals";
import { initials } from "@/lib/utils";
import { Building2, Plus, Mail, Globe, User, Trash2, FolderKanban } from "@/components/icons";

export default function CompaniesPage() {
  const { data, deleteCompany } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Фирми"
        subtitle="Клиентите, с които работиш, и техните проекти."
        icon={<Building2 size={20} />}
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} /> Нова фирма</Button>}
      />

      <div className="p-5 sm:p-8">
        {data.companies.length === 0 ? (
          <EmptyState icon={<Building2 size={22} />} title="Няма добавени фирми"
            description="Добави фирма, за да свързваш проектите с конкретен клиент."
            action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} /> Нова фирма</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.companies.map((c) => {
              const projects = data.projects.filter((p) => p.companyId === c.id);
              return (
                <div key={c.id} className="card group flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--surface-3)] to-[var(--surface-2)] text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
                        {initials(c.name)}
                      </span>
                      <div>
                        <h3 className="font-semibold group-hover:underline">{c.name}</h3>
                        {c.industry && <p className="text-xs text-[var(--muted)]">{c.industry}</p>}
                      </div>
                    </Link>
                    <button
                      onClick={() => { if (confirm(`Изтриване на „${c.name}"?`)) deleteCompany(c.id); }}
                      className="text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100 cursor-pointer"
                      aria-label="Изтрий"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {c.notes && <p className="mt-3 text-sm text-[var(--muted)]">{c.notes}</p>}

                  <div className="mt-4 space-y-1.5 text-sm">
                    {c.contactName && (
                      <p className="flex items-center gap-2 text-[var(--muted)]"><User size={14} /> {c.contactName}</p>
                    )}
                    {c.contactEmail && (
                      <a href={`mailto:${c.contactEmail}`} className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)]">
                        <Mail size={14} /> {c.contactEmail}
                      </a>
                    )}
                    {c.website && (
                      <a href={`https://${c.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)]">
                        <Globe size={14} /> {c.website}
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <Badge color={projects.length ? "var(--accent)" : undefined}>
                      <FolderKanban size={13} /> {projects.length} проект{projects.length === 1 ? "" : "а"}
                    </Badge>
                  </div>

                  {projects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {projects.map((p) => (
                        <Link key={p.id} href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs hover:bg-[var(--surface-3)]">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewCompanyModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
