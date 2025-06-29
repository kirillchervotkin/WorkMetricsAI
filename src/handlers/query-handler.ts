import { Context } from "grammy";
import { DataProcessor } from "../services/DataProcessor";
import { geminiService } from "../services/gemini";

/**
 * ПРОСТОЙ ОБРАБОТЧИК ЗАПРОСОВ
 * Получает данные из ДО → отправляет в LLM → возвращает ответ
 */
export async function handleQuery(ctx: Context) {
  if (!ctx.message?.text) return;

  const userQuery = ctx.message.text;

  try {
    await ctx.replyWithChatAction("typing");
    console.log(`📝 Запрос: "${userQuery}"`);

    // Получаем и обрабатываем релевантные данные из системы ДО
    const processor = new DataProcessor();
    const processedData = await processor.processQueryData(userQuery);
    
    console.log("📊 Обработанные данные:", processedData.summary);

    // Отправляем в LLM для анализа
    const response = await analyzeWithLLM(userQuery, processedData);
    
    await ctx.reply(response, { parse_mode: "HTML" });

  } catch (error) {
    console.error("❌ Ошибка:", error);
    await ctx.reply("❌ Произошла ошибка при обработке запроса.");
  }
}



/**
 * Анализирует запрос с помощью LLM
 */
async function analyzeWithLLM(userQuery: string, processedData: any): Promise<string> {
  console.log("🧠 Отправляем обработанные данные в LLM...");

  try {
    // Формируем оптимизированный контекст для LLM
    const context = formatDataForLLM(processedData, userQuery);

    // Отправляем в LLM
    const response = await geminiService.enhanceResponse([{ context }], "data_analysis", userQuery);

    if (response) {
      console.log("✅ LLM проанализировал обработанные данные");
      return response;
    } else {
      console.log("⚠️ LLM недоступен, fallback");
      return "❌ LLM сервис временно недоступен. Попробуйте позже.";
    }

  } catch (error) {
    console.error("❌ Ошибка LLM:", error);
    return "❌ Произошла ошибка при обработке запроса. Попробуйте позже.";
  }
}

/**
 * Форматирует обработанные данные для LLM
 */
function formatDataForLLM(processedData: any, userQuery: string): string {
  let context = `ВОПРОС: "${userQuery}"\n`;
  context += `СЕГОДНЯ: ${new Date().toISOString().split('T')[0]}\n`;
  context += `ПЕРИОД АНАЛИЗА: ${processedData.summary.dateRange}\n\n`;

  // Общая статистика
  context += `📊 ОБЩАЯ СТАТИСТИКА:\n`;
  context += `• Сотрудников: ${processedData.summary.totalUsers}\n`;
  context += `• Задач: ${processedData.summary.totalTasks}\n`;
  context += `• Записей времени: ${processedData.summary.totalTimeEntries}\n`;
  context += `• Проектов: ${processedData.summary.totalProjects}\n\n`;

  // Активность сотрудников
  if (processedData.employees.length > 0) {
    context += `👥 АКТИВНОСТЬ СОТРУДНИКОВ:\n`;
    processedData.employees.slice(0, 10).forEach((emp: any) => {
      context += `• ${emp.name}: ${emp.taskCount} задач, ${emp.totalHours.toFixed(1)} часов\n`;
      if (emp.recentTasks.length > 0) {
        context += `  Последние задачи: ${emp.recentTasks.slice(0, 3).join(', ')}\n`;
      }
    });
    context += `\n`;
  }

  // Последняя активность
  if (processedData.recentActivity.length > 0) {
    context += `⏰ ПОСЛЕДНЯЯ АКТИВНОСТЬ:\n`;
    processedData.recentActivity.slice(0, 15).forEach((activity: any) => {
      context += `• ${activity.date}: ${activity.employee} - ${activity.task} (${activity.hours}ч)\n`;
      if (activity.description) {
        context += `  ${activity.description}\n`;
      }
    });
    context += `\n`;
  }

  // Топ задач по времени
  if (processedData.topTasks.length > 0) {
    context += `🔥 ТОП ЗАДАЧ ПО ВРЕМЕНИ:\n`;
    processedData.topTasks.slice(0, 10).forEach((task: any, index: number) => {
      context += `${index + 1}. ${task.title} - ${task.hours.toFixed(1)}ч (${task.employee})\n`;
    });
    context += `\n`;
  }

  context += `\n💡 ИНСТРУКЦИЯ: Проанализируй данные и ответь на вопрос пользователя. Используй конкретные цифры и факты из предоставленных данных.`;

  return context;
}
