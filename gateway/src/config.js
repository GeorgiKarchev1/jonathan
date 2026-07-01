// Loads config from .env (if present) + process.env. No external deps:
// Node >= 20.6 ships process.loadEnvFile(). When run under systemd/pm2 the
// vars usually come from the environment directly, so a missing .env is fine.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

try {
  process.loadEnvFile(envPath);
} catch {
  // no .env file — rely on the ambient environment
}

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: num(process.env.GATEWAY_PORT, 8787),
  token: process.env.GATEWAY_TOKEN || "",

  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramAllowed: (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  claudeBin: process.env.CLAUDE_BIN || "claude",
  claudeModel: process.env.CLAUDE_MODEL || "",
  agentTimeoutMs: num(process.env.AGENT_TIMEOUT_MS, 180000),

  workspaceDir: resolve(__dirname, "..", process.env.AGENTS_WORKSPACE || "agent-workspace"),
};

/** Warn (don't crash) about anything missing, so partial setups still boot. */
export function reportConfig() {
  const ok = (b) => (b ? "✓" : "✗");
  console.log("[config] Justin gateway");
  console.log(`  HTTP            ${ok(true)} :${config.port}  (auth ${ok(!!config.token)})`);
  console.log(`  Supabase data   ${ok(!!(config.supabaseUrl && config.supabaseServiceKey))}`);
  console.log(`  Telegram        ${ok(!!config.telegramToken)}  (allowlist: ${config.telegramAllowed.length || "open"})`);
  console.log(`  Claude CLI      bin="${config.claudeBin}" model="${config.claudeModel || "default"}"`);
}
