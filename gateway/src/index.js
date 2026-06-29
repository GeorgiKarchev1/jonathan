// Justin gateway entry point. Starts the HTTP API (for the platform) and,
// if a bot token is configured, the Telegram long-polling loop. Both drive
// the same read-only agent over the same Supabase data.
import { config, reportConfig } from "./config.js";
import { startHttp } from "./http.js";
import { startTelegram } from "./telegram.js";

reportConfig();

startHttp();

if (config.telegramToken) {
  startTelegram();
} else {
  console.log("[telegram] disabled (no TELEGRAM_BOT_TOKEN)");
}

process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
