"use client";

import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Button, Field, Input } from "@/components/ui";
import { Sparkles, ArrowRight } from "@/components/icons";
import { HeroScene } from "@/components/motion";

export default function LoginPage() {
  const { ready, currentUser, data, login, signup } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && currentUser) router.replace("/dashboard");
  }, [ready, currentUser, router]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (login(email)) router.replace("/dashboard");
    else setError("Няма акаунт с този имейл. Опитай демо акаунт или се регистрирай.");
  }

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    signup(name.trim(), email.trim());
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — brand / pitch */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden border-r border-[var(--border)] p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 500px at 50% 30%, rgba(139,92,246,0.10), transparent 60%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-semibold">Justin</span>
        </div>

        {/* Premium interactive scene */}
        <div className="relative flex-1">
          <HeroScene />
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Командният център за твоите проекти.
          </h1>
          <p className="mt-4 text-[var(--muted)]">
            Управлявай фирми, проекти и екип на едно място. AI асистент, който разбира всяка задача
            и работи по нея вместо теб.
          </p>
          <p className="mt-8 text-xs text-[var(--muted-2)]">© 2026 Justin. Демо среда.</p>
        </div>
      </div>

      {/* Right — auth */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
              <Sparkles size={18} />
            </span>
            <span className="text-lg font-semibold">Justin</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Вход" : "Създай акаунт"}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {mode === "login"
              ? "Влез, за да продължиш към работното пространство."
              : "Започни безплатно за секунди."}
          </p>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <Field label="Имейл">
                <Input
                  type="email"
                  placeholder="ivan@studio.bg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </Field>
              {error && <p className="text-sm text-[var(--red)]">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Влез <ArrowRight size={16} />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-7 space-y-4">
              <Field label="Име">
                <Input placeholder="Име Фамилия" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </Field>
              <Field label="Имейл">
                <Input type="email" placeholder="ti@firma.bg" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Създай акаунт <ArrowRight size={16} />
              </Button>
            </form>
          )}

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="mt-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            {mode === "login" ? "Нямаш акаунт? Регистрирай се" : "Вече имаш акаунт? Влез"}
          </button>

          {/* Demo quick-login */}
          <div className="mt-9">
            <div className="flex items-center gap-3 text-xs text-[var(--muted-2)]">
              <span className="h-px flex-1 bg-[var(--border)]" /> или влез като демо потребител{" "}
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    login(u.email);
                    router.replace("/dashboard");
                  }}
                  className="focus-ring flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <Avatar name={u.name} color={u.color} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{u.name.split(" ")[0]}</p>
                    <p className="truncate text-[11px] text-[var(--muted-2)]">{u.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
