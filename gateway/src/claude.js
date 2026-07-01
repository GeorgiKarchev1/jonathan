// Drives the Claude CLI in pipe mode using the machine's logged-in
// subscription (Claude Max OAuth). Supports intermediate progress
// updates via onProgress callback when stderr contains status info.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { config } from "./config.js";

// Tool permissions — only pass --disallowedTools when non-empty
const BLOCKED = (process.env.BLOCKED_TOOLS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

function ensureWorkspace() {
  try { mkdirSync(config.workspaceDir, { recursive: true }); } catch {}
}

/**
 * Run one agent turn.
 * @param {object} o
 * @param {string} o.input
 * @param {string} o.systemPrompt
 * @param {string} [o.sessionId]
 * @param {function} [o.onProgress]  callback(statusText)
 * @returns {Promise<{ text: string, sessionId: string|null }>}
 */
export function askClaude({ input, systemPrompt, sessionId, onProgress }) {
  ensureWorkspace();

  const args = [
    "-p",
    "--output-format", "json",
    "--append-system-prompt", systemPrompt,
    "--strict-mcp-config",
  ];
  if (BLOCKED.length) args.push("--disallowedTools", BLOCKED.join(","));
  // Skip permissions so all tools (bash, web, github) work without prompts
  args.push("--permission-mode", "bypassPermissions");
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
      resolve({ text: "⏱️ Заявката отне твърде дълго и беше прекъсната.", sessionId: sessionId ?? null });
    }, config.agentTimeoutMs);

    // Monitor stderr for progress updates (Claude CLI sometimes emits tool names)
    child.stderr.on("data", (d) => {
      const chunk = d.toString();
      stderr += chunk;

      if (onProgress) {
        const line = chunk.trim();
        // Tool brackets: [Read], [Bash], etc.
        if (line.startsWith("[")) {
          const clean = line.replace(/^\[+|\]+$/g, "").trim();
          if (clean && clean !== String(child.pid)) {
            onProgress(clean);
          }
        }
      }
    });

    child.stdout.on("data", (d) => (stdout += d));

    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error("[claude] spawn error:", e.message);
      resolve({ text: `⚠️ Грешка: ${e.message}`, sessionId: sessionId ?? null });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0 && !stdout.trim()) {
        console.error(`[claude] exited ${code}:`, stderr.slice(0, 300));
        resolve({ text: "⚠️ Възникна грешка при обработката. Опитай пак след малко.", sessionId: sessionId ?? null });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const text = parsed.result ?? parsed.text ?? stdout;
        resolve({ text: String(text).trim(), sessionId: parsed.session_id ?? sessionId ?? null });
      } catch {
        resolve({ text: stdout.trim() || "(празен отговор)", sessionId: sessionId ?? null });
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}
