"use client";

import { cn, initials } from "@/lib/utils";
import { X } from "@/components/icons";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
} from "react";

// ---------------- Button ----------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "shine bg-white text-black hover:bg-white font-semibold",
  secondary: "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)] border border-[var(--border-strong)]",
  outline: "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)] border border-[var(--border-strong)]",
  ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]",
  danger: "bg-transparent text-[var(--red)] hover:bg-[rgba(239,68,68,0.12)] border border-transparent hover:border-[rgba(239,68,68,0.3)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5 rounded-full",
  md: "h-9.5 px-4.5 text-sm gap-2 rounded-full",
  lg: "h-11 px-6 text-[15px] gap-2 rounded-full",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------- Segmented control ----------------
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full font-medium transition-colors cursor-pointer",
            size === "sm" ? "px-3 py-1 text-[13px]" : "px-4 py-1.5 text-sm",
            value === o.value
              ? "bg-white text-black"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------- Badge ----------------
export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={
        color
          ? { color, background: `color-mix(in oklab, ${color} 16%, transparent)` }
          : { color: "var(--muted)", background: "var(--surface-2)" }
      }
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", className)}
      style={{ background: color }}
    />
  );
}

// ---------------- Avatar ----------------
export function Avatar({
  name,
  color,
  size = 32,
  className,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-black/20",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: color ?? "var(--accent)",
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarGroup({
  people,
  size = 28,
  max = 4,
}: {
  people: { name: string; color?: string }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={p.name} color={p.color} size={size} className="ring-2 ring-[var(--surface)]" />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--muted)] font-semibold ring-2 ring-[var(--surface)]"
          style={{ width: size, height: size, fontSize: size * 0.36, marginLeft: -size * 0.3 }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

// ---------------- Inputs ----------------
const fieldBase =
  "focus-ring w-full rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] transition-colors hover:border-[var(--border-strong)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-9.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "py-2 min-h-20 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-9.5 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--muted-2)]">{hint}</span>}
    </label>
  );
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in" onClick={onClose} />
      <div
        className="card glass relative z-10 my-auto w-full animate-in shadow-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton onClick={onClose} aria-label="Затвори">
            <X size={18} />
          </IconButton>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Misc ----------------
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(value * 100)}%`, background: color ?? "var(--accent)" }}
      />
    </div>
  );
}
