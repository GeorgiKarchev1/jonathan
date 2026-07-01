// Telegram bot via long-polling (getUpdates). No public URL / TLS needed,
// so it works behind NAT on the clawbox machine. Same agent + data as the
// platform; each Telegram chat maps to its own conversation/session.
// Supports images, documents, text messages, and progress updates.
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

/**
 * Download a Telegram file by file_id and return its URL accessible by Claude CLI.
 */
async function resolveFileUrl(fileId) {
  try {
    const res = await call("getFile", { file_id: fileId });
    if (res.ok && res.result?.file_path) {
      return `https://api.telegram.org/file/bot${config.telegramToken}/${res.result.file_path}`;
    }
  } catch (e) {
    console.error("[telegram] getFile failed:", e.message);
  }
  return null;
}

/** Extract all media items from a Telegram message. Returns [{ url, type }] */
async function extractMedia(msg) {
  const items = [];

  // Photos (photo array, last element is highest resolution)
  if (msg.photo && msg.photo.length > 0) {
    const best = msg.photo[msg.photo.length - 1];
    const url = await resolveFileUrl(best.file_id);
    if (url) items.push({ url, type: "image" });
  }

  // Single document / image sent as document
  if (msg.document) {
    if (msg.document.mime_type?.startsWith("image/")) {
      const url = await resolveFileUrl(msg.document.file_id);
      if (url) items.push({ url, type: "image" });
    }
  }

  return items;
}

/** Map Claude CLI stderr tool names to user-facing emoji + text */
const progressIcons = {
  "Read": "📖",
  "Write": "✍️",
  "Edit": "✏️",
  "Bash": "💻",
  "Glob": "🔍",
  "Grep": "🔎",
  "WebFetch": "🌐",
  "WebSearch": "🔍",
  "Task": "📋",
  "TodoWrite": "📝",
  "NotebookEdit": "📓",
};

function mapProgress(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Check known tool names
  for (const [tool, icon] of Object.entries(progressIcons)) {
    if (lower.includes(tool.toLowerCase())) {
      return `${icon} ${tool}`;
    }
  }

  // Generic patterns
  if (lower.includes("think") || lower.includes("reason")) return "🤔 Мисля…";
  if (lower.includes("read") || lower.includes("load")) return "📖 Чета…";
  if (lower.includes("search") || lower.includes("find")) return "🔍 Търся…";
  if (lower.includes("execut") || lower.includes("run") || lower.includes("bash")) return "💻 Изпълнявам…";
  if (lower.includes("fetch") || lower.includes("download")) return "🌐 Свалям…";
  if (lower.includes("write") || lower.includes("edit") || lower.includes("patch")) return "✍️ Пиша…";

  return null;
}

/** Debounced progress — avoid flooding Telegram with updates */
function makeProgressUpdater(statusMsgId, chatId, intervalMs = 12000) {
  let lastText = "";
  let lastProgressTime = 0;
  let progressCount = 0;

  return async (raw) => {
    const mapped = mapProgress(raw);
    if (!mapped || mapped === lastText) return;

    const now = Date.now();
    // Don't send more than once per intervalMs
    if (now - lastProgressTime < intervalMs) return;

    lastText = mapped;
    lastProgressTime = now;
    progressCount++;

    let progressText = `⏳ Работя…`;

    const dots = ".".repeat(Math.min(progressCount % 3 + 1, 3));
    const steps = [];

    if (mapped.includes("📖")) steps.push("📖 чета");
    if (mapped.includes("💻")) steps.push("💻 команди");
    if (mapped.includes("🔍")) steps.push("🔍 търся");

    if (steps.length > 0) {
      progressText = `⏳ ${mapped}${dots}`;
    } else {
      progressText = `⏳ ${mapped}${dots}`;
    }

    // Update thinking message
    if (statusMsgId) {
      try {
        await call("editMessageText", {
          chat_id: chatId,
          message_id: statusMsgId,
          text: progressText,
        });
      } catch {}
    }
  };
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const caption = (msg.caption || "").trim();
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

  // Extract media from the message
  const media = await extractMedia(msg);
  const messageText = text || caption || "";

  if (!messageText && media.length === 0) {
    await call("sendMessage", { chat_id: chatId, text: "Изпрати ми текст, снимка или документ." });
    return;
  }

  await call("sendChatAction", { chat_id: chatId, action: "typing" });

  // Send a "thinking" status message that will be updated with progress
  const sendThinking = media.length > 0
    ? "🖼️ Анализирам изображение…"
    : "🤔 Мисля…";

  let statusMsg = await call("sendMessage", {
    chat_id: chatId,
    text: sendThinking,
  });
  const statusMsgId = statusMsg?.result?.message_id;

  // Keep the typing indicator alive while processing
  const typingInterval = setInterval(() => {
    call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
  }, 4000);

  // Create the progress updater
  const updateProgress = makeProgressUpdater(statusMsgId, chatId, 12000);
  const onProgress = (status) => updateProgress(status);

  try {
    const reply = await runAgent({
      conversationId,
      message: messageText,
      userName,
      media,
      onProgress,
    });

    clearInterval(typingInterval);

    // Delete the "thinking" status message, then send the actual reply
    if (statusMsgId) {
      call("deleteMessage", { chat_id: chatId, message_id: statusMsgId }).catch(() => {});
    }

    for (const part of chunk(reply)) {
      await call("sendMessage", { chat_id: chatId, text: part });
    }
  } catch (e) {
    clearInterval(typingInterval);
    console.error("[telegram] agent error:", e);

    if (statusMsgId) {
      await call("editMessageText", {
        chat_id: chatId,
        message_id: statusMsgId,
        text: "⚠️ Възникна грешка. Опитай пак след малко.",
      }).catch(async () => {
        await call("sendMessage", { chat_id: chatId, text: "⚠️ Възникна грешка. Опитай пак след малко." });
      });
    } else {
      await call("sendMessage", { chat_id: chatId, text: "⚠️ Възникна грешка. Опитай пак след малко." });
    }
  }
}

export async function startTelegram() {
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
          if (update.message) handleMessage(update.message);
        }
      }
    } catch (e) {
      console.error("[telegram] poll error:", e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
