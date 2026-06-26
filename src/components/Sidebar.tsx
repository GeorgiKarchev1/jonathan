"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  CheckSquare,
  Sparkles,
  Robot,
  Paperclip,
  Feedback,
  Settings,
  LogOut,
  X,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Табло", icon: LayoutDashboard },
  { href: "/projects", label: "Проекти", icon: FolderKanban },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
  { href: "/companies", label: "Фирми", icon: Building2 },
  { href: "/files", label: "Файлове", icon: Paperclip },
  { href: "/agents", label: "Агенти", icon: Robot },
  { href: "/chat", label: "AI Асистент", icon: Sparkles },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentUser, logout, data } = useStore();

  const activeProjects = data.projects.filter((p) => p.status === "active").length;

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";
  const feedbackUnread = data.feedback.filter((f) => {
    const last = f.messages[f.messages.length - 1];
    return f.status === "open" && last?.from === "user";
  }).length;

  const nav = isAdmin ? [...NAV, { href: "/feedback", label: "Обратна връзка", icon: Feedback }] : NAV;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
            <Sparkles size={15} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Justin</span>
        </Link>
        {onNavigate && (
          <button className="md:hidden text-[var(--muted)]" onClick={onNavigate} aria-label="Затвори">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-strong)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] border border-transparent"
              )}
            >
              <Icon
                size={18}
                className={active ? "text-[var(--foreground)]" : "text-[var(--muted-2)] group-hover:text-[var(--muted)]"}
              />
              {label}
              {href === "/projects" && activeProjects > 0 && (
                <span className="ml-auto rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                  {activeProjects}
                </span>
              )}
              {href === "/feedback" && feedbackUnread > 0 && (
                <span className="ml-auto rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {feedbackUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={currentUser?.name ?? "?"} color={currentUser?.color} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentUser?.name}</p>
            <p className="truncate text-xs text-[var(--muted-2)]">{currentUser?.title ?? currentUser?.email}</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors"
          >
            <Settings size={16} /> Настройки
          </Link>
          <button
            onClick={logout}
            className="flex items-center justify-center rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--red)] transition-colors cursor-pointer"
            aria-label="Изход"
            title="Изход"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
