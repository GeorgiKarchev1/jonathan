// Minimal HTTP API for the platform. The Next.js app calls this from its
// server-side /api/agent route (never from the browser) with a bearer token.
import { createServer } from "node:http";
import { config } from "./config.js";
import { runAgent, resetConversation } from "./agent.js";

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

function authed(req) {
  if (!config.token) return true; // no token configured → open (dev only)
  const h = req.headers["authorization"] || "";
  return h === `Bearer ${config.token}`;
}

export function startHttp() {
  const server = createServer(async (req, res) => {
    // health check (no auth) for systemd / uptime probes
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, service: "justin-gateway" });
    }

    if (req.method === "POST" && req.url === "/chat") {
      if (!authed(req)) return send(res, 401, { error: "unauthorized" });
      const body = await readBody(req);
      if (!body || !body.message) return send(res, 400, { error: "message is required" });

      const conversationId = body.conversationId || "platform:default";
      try {
        const reply = await runAgent({
          conversationId,
          message: String(body.message),
          userName: body.userName,
        });
        return send(res, 200, { reply, conversationId });
      } catch (e) {
        console.error("[http] /chat failed:", e);
        return send(res, 500, { error: "agent_failed" });
      }
    }

    if (req.method === "POST" && req.url === "/reset") {
      if (!authed(req)) return send(res, 401, { error: "unauthorized" });
      const body = await readBody(req);
      if (body?.conversationId) resetConversation(body.conversationId);
      return send(res, 200, { ok: true });
    }

    send(res, 404, { error: "not_found" });
  });

  server.listen(config.port, () => {
    console.log(`[http] listening on :${config.port}`);
  });
  return server;
}
