// Drives the Claude CLI in headless mode using the machine's logged-in
// subscription (NOT the Anthropic API / tokens). Read-only by construction:
// all tools are disabled and any inherited MCP config is ignored, so the
// agent can only produce text grounded on the prompt we give it.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { config } from "./config.js";

// Belt-and-suspenders: block every built-in tool. The agent has no business
// touching the filesystem/shell/web on the clawbox machine.
const BLOCKED_TOOLS = [
  "Bash", "Read", "Write", "Edit", "Glob", "Grep",
  "WebFetch", "WebSearch", "NotebookEdit", "Task", "TodoWrite",
].join(",");

function ensureWorkspace() {
  try {
    mkdirSync(config.workspaceDir, { recursive: true });
  } catch {
    /* already exists */
  }
}

/**
 * Run one agent turn.
 * @param {object} o
 * @param {string} o.input         the user's message
 * @param {string} o.systemPrompt  Justin persona + workspace snapshot
 * @param {string} [o.sessionId]   resume an existing CLI session for continuity
 * @returns {Promise<{ text: string, sessionId: string|null }>}
 */
export function askClaude({ input, systemPrompt, sessionId }) {
  ensureWorkspace();

  const args = [
    "-p",
    "--output-format", "json",
    "--append-system-prompt", systemPrompt,
    "--strict-mcp-config",            // ignore any .mcp.json on disk
    "--disallowedTools", BLOCKED_TOOLS,
  ];
  if (config.claudeModel) args.push("--model", config.claudeModel);
  if (sessionId) args.push("--resume", sessionId);

  return new Promise((resolve) => {
    const child = spawn(config.claudeBin, args, {
      cwd: config.workspaceDir,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ text: "⏱️ Заявката отне твърде дълго и беше прекъсната. Опитай отново или формулирай по-кратко.", sessionId: sessionId ?? null });
    }, config.agentTimeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error("[claude] spawn error:", e.message);
      resolve({ text: `⚠️ Не успях да стартирам Claude CLI (${e.message}). Провери, че \`${config.claudeBin}\` е инсталиран и логнат.`, sessionId: sessionId ?? null });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0 && !stdout.trim()) {
        console.error(`[claude] exited ${code}:`, stderr.slice(0, 500));
        resolve({ text: "⚠️ Възникна грешка при обработката. Опитай пак след малко.", sessionId: sessionId ?? null });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const text = parsed.result ?? parsed.text ?? stdout;
        resolve({ text: String(text).trim(), sessionId: parsed.session_id ?? sessionId ?? null });
      } catch {
        // not JSON — return raw output
        resolve({ text: stdout.trim() || "(празен отговор)", sessionId: sessionId ?? null });
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}
