"use client";

import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { ready, currentUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(currentUser ? "/dashboard" : "/login");
  }, [ready, currentUser, router]);

  return (
    <div className="flex h-screen items-center justify-center text-[var(--muted)]">
      Зареждане…
    </div>
  );
}
