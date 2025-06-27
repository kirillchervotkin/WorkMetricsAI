import { Bot, Context, GrammyError, HttpError } from "grammy";
import { config } from "./config";
import { startHandler } from "./handlers/start";
import { helpHandler } from "./handlers/help";
import { handleQuery } from "./handlers/query-handler";
import { testHandler } from "./handlers/test-handler";

const bot = new Bot(config.BOT_TOKEN);
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`Response time: ${ms}ms`);
});
bot.command("start", startHandler);
bot.command("help", helpHandler);
bot.command("test", testHandler);

bot.command("projects", async (ctx) => {
  await ctx.replyWithChatAction("typing");
  const fakeMessage = { text: "список активных проектов" };
  const fakeCtx = { ...ctx, message: { ...ctx.message, ...fakeMessage } };
  await handleQuery(fakeCtx as any);
});

bot.command("status", async (ctx) => {
  const { apiContainer } = await import("./container/DIContainer");
  const currentMode = apiContainer.getCurrentMode();

  const modeEmoji = {
    'mock': '🎭',
    'real': '🌐',
    'hybrid': '🔄'
  };

  const modeDescription = {
    'mock': 'Тестовые данные',
    'real': 'Реальный API',
    'hybrid': 'Гибридный режим'
  };

  await ctx.reply(
    `🟢 **Бот работает нормально!**\n\n` +
    `${modeEmoji[currentMode]} **Режим данных:** ${modeDescription[currentMode]}\n` +
    `📡 **API статус:** Активно\n\n` +
    `💡 Используйте \`/test\` для управления источником данных`,
    { parse_mode: "Markdown" }
  );
});

bot.on("message:text", handleQuery);
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);

  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
async function startBot() {
  try {
    console.log("🚀 Запуск бота документооборота...");
    await bot.start();
  } catch (error) {
    console.error("❌ Ошибка запуска бота:", error);
    process.exit(1);
  }
}

process.once("SIGINT", () => {
  console.log("🛑 Остановка бота...");
  bot.stop();
});

process.once("SIGTERM", () => {
  console.log("🛑 Остановка бота...");
  bot.stop();
});

startBot();
