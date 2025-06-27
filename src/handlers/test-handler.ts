import { Context } from "grammy";
import { apiContainer, getDocumentAPI } from "../container/DIContainer";
import { HybridDocumentAPI } from "../implementations/HybridDocumentAPI";

export async function testHandler(ctx: Context) {
  const messageText = ctx.message?.text || "";
  const args = messageText.split(" ").slice(1);

  if (args.length === 0) {
    await ctx.reply(
      `🧪 **Команда /test - Управление источником данных**\n\n` +
      `**Доступные команды:**\n` +
      `• \`/test status\` - показать текущий режим\n` +
      `• \`/test mock\` - переключиться на тестовые данные\n` +
      `• \`/test real\` - переключиться на реальный API\n` +
      `• \`/test hybrid\` - включить гибридный режим (реальный + fallback)\n` +
      `• \`/test connection\` - проверить подключение к реальному API\n` +
      `• \`/test query <запрос>\` - выполнить тестовый запрос\n\n` +
      `**Примеры:**\n` +
      `• \`/test query кто работал вчера\`\n` +
      `• \`/test query сколько часов у Артема\`\n` +
      `• \`/test query список проектов\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case "status":
      await handleStatusCommand(ctx);
      break;
    
    case "mock":
      await handleSwitchCommand(ctx, "mock");
      break;
    
    case "real":
      await handleSwitchCommand(ctx, "real");
      break;
    
    case "hybrid":
      await handleSwitchCommand(ctx, "hybrid");
      break;
    
    case "connection":
      await handleConnectionTest(ctx);
      break;
    
    case "query":
      const query = args.slice(1).join(" ");
      if (query) {
        await handleTestQuery(ctx, query);
      } else {
        await ctx.reply("❌ Укажите запрос после команды query\n\nПример: `/test query кто работал вчера`");
      }
      break;
    
    default:
      await ctx.reply(
        `❌ Неизвестная команда: \`${command}\`\n\n` +
        `Используйте \`/test\` без параметров для просмотра справки.`,
        { parse_mode: "Markdown" }
      );
  }
}

async function handleStatusCommand(ctx: Context) {
  try {
    await ctx.replyWithChatAction("typing");
    
    const api = getDocumentAPI();
    let statusMessage = "📊 **Статус системы данных:**\n\n";

    if (api instanceof HybridDocumentAPI) {
      const hybridAPI = api as any;
      const currentMode = hybridAPI.getCurrentMode ? hybridAPI.getCurrentMode() : 'unknown';
      
      statusMessage += `🔄 **Режим:** Гибридный (${currentMode})\n`;
      statusMessage += `📡 **Описание:** Пробует реальный API, при неудаче использует тестовые данные\n\n`;

      if (hybridAPI.getStatus) {
        const status = await hybridAPI.getStatus();
        if (status.success) {
          statusMessage += `✅ **Реальный API:** ${status.data.realAPIAvailable ? 'Доступен' : 'Недоступен'}\n`;
          statusMessage += `🎭 **Тестовые данные:** ${status.data.mockAPIAvailable ? 'Доступны' : 'Недоступны'}\n`;
        }
      }
    } else {
      statusMessage += `📡 **Режим:** Неизвестный\n`;
      statusMessage += `🔧 **Тип API:** ${api.constructor.name}\n`;
    }
    
    statusMessage += `\n💡 **Совет:** Используйте \`/test connection\` для проверки подключения к реальному API`;
    
    await ctx.reply(statusMessage, { parse_mode: "Markdown" });
    
  } catch (error: any) {
    console.error("Error in status command:", error);
    await ctx.reply(`❌ Ошибка при получении статуса: ${error.message}`);
  }
}

async function handleSwitchCommand(ctx: Context, mode: 'mock' | 'real' | 'hybrid') {
  try {
    await ctx.replyWithChatAction("typing");
    
    let message = "";
    
    switch (mode) {
      case 'mock':
        apiContainer.switchToMock();
        message = "🎭 **Переключено на тестовые данные**\n\n" +
                 "Теперь все запросы будут обрабатываться с использованием тестовых данных.\n" +
                 "Это полезно для демонстрации и тестирования функциональности.";
        break;
      
      case 'real':
        apiContainer.switchToReal();
        message = "🌐 **Переключено на реальный API**\n\n" +
                 "⚠️ Внимание: Если реальный API недоступен, запросы могут завершаться ошибкой.\n" +
                 "Используйте `/test connection` для проверки доступности.";
        break;
      
      case 'hybrid':
        apiContainer.switchToHybrid();
        message = "🔄 **Включен гибридный режим**\n\n" +
                 "Система будет пробовать реальный API, а при неудаче автоматически " +
                 "переключаться на тестовые данные. Это оптимальный режим для работы.";
        break;
    }
    
    await ctx.reply(message, { parse_mode: "Markdown" });
    
  } catch (error: any) {
    console.error(`Error switching to ${mode}:`, error);
    await ctx.reply(`❌ Ошибка при переключении в режим ${mode}: ${error.message}`);
  }
}

async function handleConnectionTest(ctx: Context) {
  try {
    await ctx.replyWithChatAction("typing");
    await ctx.reply("🔌 Проверяю подключение к реальному API...");

    const { RealDocumentAPI } = await import("../implementations/RealDocumentAPI");
    const realAPI = new RealDocumentAPI();
    const result = await realAPI.testConnection();
    
    let message = "📡 **Результат проверки подключения:**\n\n";
    
    if (result.success) {
      message += `✅ **Статус:** Подключение успешно!\n`;
      message += `📊 **Код ответа:** ${result.data?.statusCode || 'N/A'}\n`;
      message += `💡 **Рекомендация:** Можно использовать реальный API`;
    } else {
      message += `❌ **Статус:** Подключение неудачно\n`;
      message += `📝 **Ошибка:** ${result.message}\n`;
      message += `💡 **Рекомендация:** Используйте тестовые данные или гибридный режим`;
      
      if (result.error) {
        message += `\n🔍 **Детали ошибки:** ${JSON.stringify(result.error, null, 2)}`;
      }
    }
    
    await ctx.reply(message, { parse_mode: "Markdown" });
    
  } catch (error: any) {
    console.error("Error testing connection:", error);
    await ctx.reply(`❌ Ошибка при проверке подключения: ${error.message}`);
  }
}

async function handleTestQuery(ctx: Context, query: string) {
  try {
    await ctx.replyWithChatAction("typing");

    await ctx.reply(`🧪 **Тестовый запрос:** "${query}"\n\n⏳ Обрабатываю...`);

    const { handleQuery } = await import("./query-handler");
    const fakeMessage = { text: query };
    const fakeCtx = {
      ...ctx,
      message: { ...ctx.message, ...fakeMessage },
      reply: async (text: string, options?: any) => {
        const testPrefix = "🧪 **[ТЕСТ]** ";
        return ctx.reply(testPrefix + text, options);
      }
    };
    await handleQuery(fakeCtx as any);
    
  } catch (error: any) {
    console.error("Error in test query:", error);
    await ctx.reply(`❌ Ошибка при выполнении тестового запроса: ${error.message}`);
  }
}
