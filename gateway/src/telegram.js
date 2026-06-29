// Telegram bot via long-polling (getUpdates). No public URL / TLS needed,
// so it works behind NAT on the clawbox machine. Same agent + data as the
// platform; each Telegram chat maps to its own conversation/session.
import { config } from "./config.js";
import { runAgent, resetConversation } from "./agent.js";

const api = (method) => `https://api.telegram.org/bot${config.telegramToken}/${method}`;

async function call(method, payload) {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const allowed = (chatId) =>
  config.telegramAllowed.length === 0 || config.telegramAllowed.includes(String(chatId));

// Telegram caps messages at 4096 chars; split long replies.
function chunk(text, size = 3800) {
  const parts = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts.length ? parts : ["(празен отговор)"];
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const userName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || msg.from?.username;

  if (!allowed(chatId)) {
    await call("sendMessage", { chat_id: chatId, text: "Нямаш достъп до този асистент." });
    console.warn(`[telegram] blocked chat ${chatId} (${userName})`);
    return;
  }

  const conversationId = `tg:${chatId}`;

  if (text === "/start") {
    await call("sendMessage", {
      chat_id: chatId,
      text: "Здравей! Аз съм Justin — асистентът на екипа. Питай ме за проектите, задачите, клиентите или какво е спешно. (/new за нов разговор)",
    });
    return;
  }
  if (text === "/new") {
    resetConversation(conversationId);
    await call("sendMessage", { chat_id: chatId, text: "Започвам нов разговор. 🆕" });
    return;
  }
  if (!text) {
    await call("sendMessage", { chat_id: chatId, text: "Засега разбирам само текст. Снимки и файлове ще добавим скоро." });
    return;
  }

  await call("sendChatAction", { chat_id: chatId, action: "typing" });
  try {
    const reply = await runAgent({ conversationId, message: text, userName });
    for (const part of chunk(reply)) {
      await call("sendMessage", { chat_id: chatId, text: part });
    }
  } catch (e) {
    console.error("[telegram] agent error:", e);
    await call("sendMessage", { chat_id: chatId, text: "⚠️ Възникна грешка. Опитай пак след малко." });
  }
}

export async function startTelegram() {
  // Make sure no webhook is set (it would block getUpdates).
  await call("deleteWebhook", { drop_pending_updates: false }).catch(() => {});

  const me = await call("getMe").catch(() => null);
  if (!me?.ok) {
    console.error("[telegram] getMe failed — check TELEGRAM_BOT_TOKEN");
    return;
  }
  console.log(`[telegram] polling as @${me.result.username}`);

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await call("getUpdates", { timeout: 30, offset, allowed_updates: ["message"] });
      if (res.ok && res.result.length) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          if (update.message) handleMessage(update.message); // fire-and-forget; replies are async
        }
      }
    } catch (e) {
      console.error("[telegram] poll error:", e.message);
      await new Promise((r) => setTimeout(r, 3000)); // backoff
    }
  }
}
