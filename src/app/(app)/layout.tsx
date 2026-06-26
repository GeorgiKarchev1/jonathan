"use client";

import { Sidebar } from "@/components/Sidebar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Sparkles } from "@/components/icons";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser } = useStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (ready && !currentUser) router.replace("/login");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <Sparkles className="animate-pulse text-[var(--accent)]" size={18} />
          Зареждане…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-[var(--border)] px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-[var(--muted)]" aria-label="Меню">
            <Menu size={22} />
          </button>
          <span className="flex items-center gap-2 font-semibold">
            <Sparkles size={16} className="text-[var(--accent)]" /> Justin
          </span>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <FeedbackWidget />
    </div>
  );
}
