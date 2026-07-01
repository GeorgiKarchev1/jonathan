// Composes the "Justin" agent: persona + a fresh workspace snapshot, with
// per-conversation session continuity. Supports images / vision through
// Claude CLI's ability to fetch image URLs in -p mode.
// Supports progress callbacks for live status updates.
import { askClaude } from "./claude.js";
import { buildSnapshot } from "./supabase.js";

const PERSONA = `Ти си Justin — главният AI асистент на едноименната платформа за управление на проекти на този екип.

Роля и контекст:
- Имаш достъп за ЧЕТЕНЕ до цялата информация на екипа: фирми/клиенти, проекти, задачи, отговорници и срокове. Подава ти се актуална снимка по-долу.
- Говори на български, естествено и по същество. Бъди кратък по подразбиране; разгръщай само ако те помолят.
- Основавай отговорите си на снимката с данни. Не измисляй проекти, задачи или хора, които ги няма. Ако нещо липсва в данните, кажи го честно.
- Можеш да обобщаваш, анализираш, приоритизираш, да предлагаш следващи стъпки и да отговаряш на въпроси за състоянието на работата.
- Имаш достъп до файловата система и можеш да изпълняваш Bash команди, да четеш/поправяш файлове, да използваш GitHub.
- Можеш да анализираш снимки и изображения, които ти се пращат.

Важно ограничение (засега):
- В момента си в режим САМО ЧЕТЕНЕ спрямо Supabase данните. Още не можеш да създаваш или променяш задачи, проекти и т.н. Ако те помолят за промяна, обясни любезно, че тази възможност предстои да бъде включена, и предложи какво би направил.`;

let snapCache = { text: "", ts: 0 };
const SNAP_TTL_MS = 20000;

async function freshSnapshot() {
  const now = Date.now();
  if (snapCache.text && now - snapCache.ts < SNAP_TTL_MS) return snapCache.text;
  const text = await buildSnapshot();
  snapCache = { text, ts: now };
  return text;
}

const sessions = new Map();

function buildUserContent(message, media) {
  if (!media || media.length === 0) return message;
  let content = message || "Виж тази снимка:";
  for (const item of media) {
    if (item.type === "image") {
      content += `\n\n[Изображение: ${item.url}]`;
    }
  }
  return content;
}

/**
 * Run one agent turn for a given conversation.
 * @param {object} o
 * @param {string} o.conversationId
 * @param {string} o.message
 * @param {string} [o.userName]
 * @param {Array}  [o.media]         [{ url, type }]
 * @param {function} [o.onProgress]  callback(statusText)
 * @returns {Promise<string>}
 */
export async function runAgent({ conversationId, message, userName, media, onProgress }) {
  const snapshot = await freshSnapshot();
  const systemPrompt = `${PERSONA}\n\n${userName ? `Пише ти: ${userName}.\n\n` : ""}${snapshot}`;

  const sessionId = sessions.get(conversationId);
  const enhancedInput = buildUserContent(message, media);
  const { text, sessionId: newSession } = await askClaude({
    input: enhancedInput,
    systemPrompt,
    sessionId,
    onProgress,
  });
  if (newSession) sessions.set(conversationId, newSession);

  return text;
}

export function resetConversation(conversationId) {
  sessions.delete(conversationId);
}
