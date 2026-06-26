"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ------------------------------------------------------------
// Reveal — smooth entrance (opacity + gentle rise). No 3D bounce.
// ------------------------------------------------------------
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (reduced()) return;
      gsap.from(ref.current, {
        opacity: 0,
        y,
        duration: 0.8,
        delay,
        ease: "power3.out",
        clearProps: "transform",
      });
    },
    { scope: ref }
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// SpotlightCard — cursor-following glow + soft lift. Buttery,
// CSS-driven (no per-frame JS layout work).
// ------------------------------------------------------------
export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    if (raf.current) return;
    const { clientX, clientY } = e;
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - r.left}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
      raf.current = null;
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`spotlight group/spot transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// HeroScene — calm, premium glass scene with aurora + parallax.
// ------------------------------------------------------------
export function HeroScene() {
  const scope = useRef<HTMLDivElement>(null);
  const layerFar = useRef<HTMLDivElement>(null);
  const layerNear = useRef<HTMLDivElement>(null);
  const fx = useRef<((v: number) => void) | null>(null);
  const fy = useRef<((v: number) => void) | null>(null);
  const nx = useRef<((v: number) => void) | null>(null);
  const ny = useRef<((v: number) => void) | null>(null);

  useGSAP(
    () => {
      // entrance
      gsap.from(".hero-rise", {
        opacity: 0,
        y: 26,
        duration: 1,
        stagger: 0.14,
        ease: "power3.out",
      });

      if (reduced()) return;
      const cfg = { duration: 1.1, ease: "power3.out" };
      fx.current = gsap.quickTo(layerFar.current, "x", cfg);
      fy.current = gsap.quickTo(layerFar.current, "y", cfg);
      nx.current = gsap.quickTo(layerNear.current, "x", cfg);
      ny.current = gsap.quickTo(layerNear.current, "y", cfg);
    },
    { scope }
  );

  function onMove(e: React.MouseEvent) {
    if (reduced() || !scope.current) return;
    const r = scope.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    fx.current?.(px * 14);
    fy.current?.(py * 14);
    nx.current?.(px * 34);
    ny.current?.(py * 34);
  }

  return (
    <div ref={scope} onMouseMove={onMove} className="absolute inset-0 overflow-hidden">
      {/* Aurora */}
      <div className="aurora">
        <span className="aurora-blob drift-a" style={{ width: 340, height: 340, left: "18%", top: "12%", background: "radial-gradient(circle, #7c3aed, transparent 70%)" }} />
        <span className="aurora-blob drift-b" style={{ width: 300, height: 300, right: "10%", top: "30%", background: "radial-gradient(circle, #2563eb, transparent 70%)" }} />
        <span className="aurora-blob drift-c" style={{ width: 260, height: 260, left: "30%", bottom: "10%", background: "radial-gradient(circle, #db2777, transparent 70%)", opacity: 0.4 }} />
      </div>

      {/* Far layer — subtle parallax */}
      <div ref={layerFar} className="absolute inset-0 flex items-center justify-center" style={{ willChange: "transform" }}>
        <div className="hero-rise gradient-border glass relative h-[300px] w-[330px] rounded-[26px] border border-[var(--border-strong)] shadow-2xl" />
      </div>

      {/* Near layer — product preview cards */}
      <div ref={layerNear} className="absolute inset-0 flex items-center justify-center" style={{ willChange: "transform" }}>
        <div className="relative h-[300px] w-[360px]">
          {/* Project card */}
          <div className="hero-rise glass absolute left-0 top-8 w-64 rounded-2xl border border-[var(--border-strong)] p-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-1.5 rounded-full" style={{ background: "linear-gradient(180deg,#a78bfa,#7c3aed)" }} />
              <div>
                <p className="text-sm font-semibold">Aurora — Онлайн магазин</p>
                <p className="text-xs text-[var(--muted)]">Aurora Foods</p>
              </div>
            </div>
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full w-1/4 rounded-full" style={{ background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
            </div>
            <div className="mt-3 flex -space-x-2">
              {["#ec4899", "#3b82f6", "#22c55e"].map((c) => (
                <span key={c} className="h-6 w-6 rounded-full ring-2 ring-black" style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* AI reply card */}
          <div className="hero-rise glass absolute bottom-2 right-0 flex w-60 items-start gap-2.5 rounded-2xl border border-[var(--border-strong)] p-3.5 shadow-2xl">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-black text-xs font-bold">✦</span>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Разбих задачата на 5 стъпки и я задвижих. Готово.
            </p>
          </div>

          {/* Status chip */}
          <div className="hero-rise glass absolute right-6 top-0 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[11px] font-medium shadow-xl">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "#3b82f6" }} />
            В процес
          </div>
        </div>
      </div>
    </div>
  );
}
