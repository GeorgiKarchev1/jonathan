// Local smoke test: talk to the agent straight from the terminal, no HTTP /
// Telegram. Usage:  node src/cli-test.js "Какво е спешно днес?"
import { runAgent } from "./agent.js";

const message = process.argv.slice(2).join(" ") || "Обобщи накратко състоянието на проектите.";

console.log(`\n> ${message}\n`);
const reply = await runAgent({ conversationId: "cli-test", message, userName: "Тест" });
console.log(reply);
console.log("");
process.exit(0);
