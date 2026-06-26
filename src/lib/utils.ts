import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  const rnd = Math.floor(performance.now() * 1000) % 1_000_000;
  return `${prefix}_${rnd.toString(36)}${(Math.floor(performance.now()) % 99991).toString(36)}`;
}

/** Initials from a name, e.g. "Иван Петров" -> "ИП" */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const MONTHS_BG = [
  "яну", "фев", "мар", "апр", "май", "юни",
  "юли", "авг", "сеп", "окт", "ное", "дек",
];

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_BG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "Без период";
  if (start && !end) return `от ${formatDate(start)}`;
  if (!start && end) return `до ${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.round((now - d) / 1000);
  const abs = Math.abs(diff);
  if (abs < 60) return "току-що";
  if (abs < 3600) return `преди ${Math.floor(abs / 60)} мин`;
  if (abs < 86400) return `преди ${Math.floor(abs / 3600)} ч`;
  if (abs < 604800) return `преди ${Math.floor(abs / 86400)} дни`;
  return formatDate(iso);
}

export function daysBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
