import type { Agent, ChatAction, Project, Task } from "./types";

// ============================================================
// Mock, context-aware assistant.
// Generates replies from the user's message + the selected
// agent + project / task. Replace `generateReply` with a real
// call to the Claude API later — the signature already carries
// the agent persona and context.
// ============================================================

export interface AiContext {
  agent?: Agent | null;
  project?: Project | null;
  task?: Task | null;
  userName?: string;
}

/** A short, persona-flavoured opener so each agent "sounds" different. */
function persona(agent?: Agent | null): string {
  if (!agent) return "";
  const skill = agent.skills?.[0];
  return skill ? `*${agent.name} · ${skill}* — ` : `*${agent.name}* — `;
}

export interface AiResult {
  content: string;
  action?: ChatAction;
}

function pickPlan(task: Task): string[] {
  const t = task.title.toLowerCase();
  if (t.includes("плащан")) {
    return [
      "Конфигуриране на доставчик и тестови ключове",
      "Checkout поток за картови плащания",
      "Алтернативни методи (наложен платеж)",
      "Webhook за потвърждение на поръчка",
      "Тестови сценарии за успех и неуспех",
    ];
  }
  if (t.includes("дизайн")) {
    return [
      "Събиране на референции и изисквания",
      "Wireframe на ключовите екрани",
      "Визуален дизайн с финалните цветове",
      "Преглед с клиента и корекции",
      "Предаване на разработка",
    ];
  }
  if (t.includes("нотификаци") || t.includes("push")) {
    return [
      "Настройка на услугата за съобщения",
      "Регистрация на устройства и токени",
      "Изпращане на тестово съобщение",
      "Обработка при отворено/затворено приложение",
      "Логване и проследяване на доставка",
    ];
  }
  return [
    "Изясняване на целта и обхвата",
    "Разбиване на по-малки подзадачи",
    "Изпълнение на основната част",
    "Преглед и тестване",
    "Финализиране и предаване",
  ];
}

export function generateReply(message: string, ctx: AiContext): AiResult {
  const msg = message.trim().toLowerCase();
  const { agent, project, task } = ctx;
  const who = persona(agent);

  // Execute / start working on the task
  if (task && (msg.includes("изпълни") || msg.includes("execute") || msg.includes("започни") || msg.includes("задействай"))) {
    return {
      content: `${who}Започвам работа по задачата „${task.title}".\n\nЩе изпълня следните стъпки автоматично:\n${pickPlan(task).map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nЩе те уведомя при готовност на всяка стъпка. Маркирах задачата като „В процес".`,
      action: { type: "execute_task", label: `Изпълни: ${task.title}`, taskId: task.id, done: false },
    };
  }

  // Ask for a plan / breakdown
  if (task && (msg.includes("план") || msg.includes("стъпк") || msg.includes("разбий") || msg.includes("раздели"))) {
    return {
      content: `${who}Ето план за „${task.title}":\n\n${pickPlan(task).map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nКажи „изпълни", за да започна.`,
      action: { type: "plan", label: "План на задачата", taskId: task.id },
    };
  }

  // Summary / status of a project
  if (project && (msg.includes("обобщи") || msg.includes("статус") || msg.includes("докъде") || msg.includes("резюме"))) {
    return {
      content: `${who}Кратко за проект „${project.name}":\n\nСтатус: ${project.status === "active" ? "активен" : project.status}. Работи се по няколко задачи паралелно. Препоръчвам да приоритизираме спешните и да затворим тези в „Преглед". Искаш ли да генерирам списък със следващите действия?`,
      action: { type: "summary", label: "Обобщение на проекта" },
    };
  }

  // Greetings
  if (msg.match(/^(здрав|здравей|хей|hi|hello|добър)/)) {
    const intro = agent ? `Здравей! Аз съм ${agent.name}${agent.description ? ` — ${agent.description.replace(/\.$/, "")}` : ""}.` : "Здравей! Тук съм да помогна.";
    const where = task ? ` Виждам, че работим по „${task.title}".` : project ? ` Контекстът е проект „${project.name}".` : "";
    return { content: `${intro}${where} С какво да започнем?` };
  }

  // Default helpful reply, grounded in agent persona + context
  const contextLine = task
    ? `Работя в контекста на задача „${task.title}"${project ? ` от проект „${project.name}"` : ""}.`
    : project
      ? `Работя в контекста на проект „${project.name}".`
      : agent?.description
        ? agent.description
        : "Готов съм да помогна с твоите проекти и задачи.";

  const skillsLine = agent?.skills?.length
    ? `\n\nСилните ми страни: ${agent.skills.join(", ")}.`
    : "";

  return {
    content: `${who}${contextLine}${skillsLine}\n\nМога да: разбия задачи на стъпки, напиша текстове, обобщя проект, предложа следващи действия или да „изпълня" дадена задача. Какво ти трябва?`,
  };
}

/** Suggested quick prompts shown above the chat input, context-aware. */
export function quickPrompts(ctx: AiContext): string[] {
  if (ctx.task) {
    return [
      `Разбий „${ctx.task.title}" на стъпки`,
      "Изпълни тази задача",
      "Какви рискове виждаш?",
    ];
  }
  if (ctx.project) {
    return [
      "Обобщи статуса на проекта",
      "Кои са следващите действия?",
      "Какво е спешно днес?",
    ];
  }
  return ["Какво да свърша днес?", "Обобщи активните проекти", "Помогни с приоритизиране"];
}
