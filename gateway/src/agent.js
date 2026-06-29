// Composes the "Justin" agent: persona + a fresh workspace snapshot, with
// per-conversation session continuity. Read-only phase.
import { askClaude } from "./claude.js";
import { buildSnapshot } from "./supabase.js";

const PERSONA = `Ти си Justin — главният AI асистент на едноименната платформа за управление на проекти на този екип.

Роля и контекст:
- Имаш достъп за ЧЕТЕНЕ до цялата информация на екипа: фирми/клиенти, проекти, задачи, отговорници и срокове. Подава ти се актуална снимка по-долу.
- Говори на български, естествено и по същество. Бъди кратък по подразбиране; разгръщай само ако те помолят.
- Основавай отговорите си на снимката с данни. Не измисляй проекти, задачи или хора, които ги няма. Ако нещо липсва в данните, кажи го честно.
- Можеш да обобщаваш, анализираш, приоритизираш, да предлагаш следващи стъпки и да отговаряш на въпроси за състоянието на работата.

Важно ограничение (засега):
- В момента си в режим САМО ЧЕТЕНЕ. Още не можеш да създаваш или променяш задачи, проекти и т.н. Ако те помолят за промяна, обясни любезно, че тази възможност предстои да бъде включена, и предложи какво би направил.`;

// Short snapshot cache so a burst of messages doesn't hammer the DB.
let snapCache = { text: "", ts: 0 };
const SNAP_TTL_MS = 20000;

async function freshSnapshot() {
  const now = Date.now();
  if (snapCache.text && now - snapCache.ts < SNAP_TTL_MS) return snapCache.text;
  const text = await buildSnapshot();
  snapCache = { text, ts: now };
  return text;
}

// conversationId -> Claude CLI session id (in-memory; resets on restart)
const sessions = new Map();

/**
 * Run one agent turn for a given conversation.
 * @param {object} o
 * @param {string} o.conversationId  stable id (platform conv id or "tg:<chatId>")
 * @param {string} o.message         the user's text
 * @param {string} [o.userName]      who is asking (for nicer replies)
 * @returns {Promise<string>} the assistant reply text
 */
export async function runAgent({ conversationId, message, userName }) {
  const snapshot = await freshSnapshot();
  const systemPrompt = `${PERSONA}\n\n${userName ? `Пише ти: ${userName}.\n\n` : ""}${snapshot}`;

  const sessionId = sessions.get(conversationId);
  const { text, sessionId: newSession } = await askClaude({ input: message, systemPrompt, sessionId });
  if (newSession) sessions.set(conversationId, newSession);

  return text;
}

/** Drop a conversation's session (e.g. "/new" in Telegram). */
export function resetConversation(conversationId) {
  sessions.delete(conversationId);
}
