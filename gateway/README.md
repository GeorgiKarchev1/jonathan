# Justin Gateway

The brain bridge for **Justin**. It drives the **Claude CLI in headless mode**
(using the machine's logged-in subscription — *not* the Anthropic API / tokens)
and exposes the agent to two front-ends:

- **The platform** — via an HTTP endpoint (`POST /chat`) that the Next.js app
  calls from its server-side `/api/agent` route.
- **Telegram** — via long-polling (no public URL needed).

Both hit the **same agent**, with the **same memory and the same data**.

```
Platform chat ─┐
               ├─► gateway ──► claude -p (headless, subscription) ─► text reply
Telegram bot ──┘     │
                     └─ reads ALL team data from Supabase (service role) → injected as context
```

## Current phase: READ-ONLY

The agent is read-only **by construction**: every built-in tool is disabled and
any on-disk MCP config is ignored (`--strict-mcp-config`), so it can only read
the snapshot the gateway gives it and answer. It cannot modify the database or
touch the clawbox filesystem. Write actions are a later phase.

## Files

| File | Purpose |
|---|---|
| `src/index.js` | entry — starts HTTP + Telegram |
| `src/config.js` | env config (uses Node's built-in `.env` loader) |
| `src/supabase.js` | reads team data (service role) → compact snapshot |
| `src/claude.js` | spawns the Claude CLI headless, no tools, session continuity |
| `src/agent.js` | "Justin" persona + snapshot + per-conversation sessions |
| `src/http.js` | `POST /chat`, `POST /reset`, `GET /health` (bearer auth) |
| `src/telegram.js` | long-polling bot |
| `src/cli-test.js` | talk to the agent from the terminal |

## Setup on clawbox

1. **Node 20+** and the **Claude CLI**, logged in as the run user:
   ```bash
   node --version            # >= 20
   claude                    # run once, complete /login (subscription)
   claude -p "ping"          # confirm headless works
   ```
2. **Copy the `gateway/` folder** to the machine (e.g. `/home/clawbox/justin/gateway`).
   > Keep it in its own folder — do not mix with other projects on the box.
3. **Install deps & configure:**
   ```bash
   cd gateway
   npm install
   cp .env.example .env
   # edit .env — see below
   ```
4. **Fill `.env`:**
   - `GATEWAY_TOKEN` — `openssl rand -hex 32` (the platform sends this).
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → service_role.
   - `TELEGRAM_BOT_TOKEN` — your bot token.
   - `TELEGRAM_ALLOWED_CHAT_IDS` — your/team chat ids (get yours from @userinfobot).
5. **Smoke test:**
   ```bash
   node src/cli-test.js "Какво е спешно по проектите днес?"
   ```
6. **Run as a service:**
   ```bash
   sudo cp justin-gateway.service /etc/systemd/system/
   # edit User / WorkingDirectory / PATH inside it first
   sudo systemctl daemon-reload
   sudo systemctl enable --now justin-gateway
   journalctl -u justin-gateway -f
   ```
7. **Health check:** `curl localhost:8787/health`

## Platform wiring (next step)

The Next.js app needs a server route `src/app/api/agent/route.ts` that forwards
to `POST http://<clawbox>:8787/chat` with `Authorization: Bearer $GATEWAY_TOKEN`,
plus env on the app side:

```
AGENT_GATEWAY_URL=http://<clawbox-host>:8787
AGENT_GATEWAY_TOKEN=<same as GATEWAY_TOKEN>
```

Then the chat UI calls `/api/agent` instead of the local mock. (Wired in the
follow-up step.)
