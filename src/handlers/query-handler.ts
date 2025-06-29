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
      // Очищаем неподдерживаемые HTML теги
      const cleanResponse = cleanUnsupportedHtmlTags(response);
      return cleanResponse;
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
  context += `АНАЛИЗИРУЕМЫЙ ПЕРИОД: ${processedData.summary.dateRange}\n\n`;

  // Общая статистика за запрашиваемый период
  context += `📊 СТАТИСТИКА ЗА ПЕРИОД "${processedData.summary.dateRange.toUpperCase()}":\n`;
  context += `• Всего сотрудников в системе: ${processedData.summary.totalUsers}\n`;
  context += `• Задач за период: ${processedData.summary.totalTasks}\n`;
  context += `• Записей времени за период: ${processedData.summary.totalTimeEntries}\n`;
  context += `• Проектов: ${processedData.summary.totalProjects}\n\n`;

  context += `⚠️ ВАЖНО: Данные показаны только за запрашиваемый период!\n\n`;

  // Детальная активность сотрудников
  if (processedData.employees.length > 0) {
    context += `👥 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ПО СОТРУДНИКАМ:\n`;
    processedData.employees.forEach((emp: any) => {
      context += `\n📋 ${emp.name}:\n`;
      context += `• Всего задач: ${emp.taskCount}\n`;
      context += `• Общее время работы: ${emp.totalHours.toFixed(1)} часов\n`;

      if (emp.workTypes.length > 0) {
        context += `• Типы работ: ${emp.workTypes.join(', ')}\n`;
      }

      if (emp.projects.length > 0) {
        context += `• Проекты: ${emp.projects.join(', ')}\n`;
      }

      if (emp.allTasks.length > 0) {
        context += `• Задачи:\n`;
        emp.allTasks.forEach((task: any, index: number) => {
          context += `  ${index + 1}. ${task.title} (${task.hours}ч, ${task.date}, ${task.status})\n`;
          if (task.description && task.description !== task.title) {
            context += `     ${task.description}\n`;
          }
        });
      }

      if (emp.timeEntries.length > 0) {
        context += `• Записи времени:\n`;
        emp.timeEntries.forEach((entry: any, index: number) => {
          context += `  ${index + 1}. ${entry.date}: ${entry.hours}ч - ${entry.description}\n`;
          if (entry.workType) {
            context += `     Тип работы: ${entry.workType}\n`;
          }
        });
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

  context += `\n💡 ИНСТРУКЦИЯ ДЛЯ АНАЛИЗА:\n`;
  context += `• ОТВЕЧАЙ ТОЛЬКО НА ТО, ЧТО КОНКРЕТНО СПРАШИВАЕТСЯ В ЗАПРОСЕ\n`;
  context += `• НЕ добавляй лишнюю информацию, которую не запрашивали\n`;
  context += `• Если запрос о списке пользователей - выведи только список пользователей\n`;
  context += `• Если запрос о задачах - выведи только задачи\n`;
  context += `• Если запрос о времени - выведи только информацию о времени\n`;
  context += `• Все данные уже отфильтрованы по запрашиваемому периоду: ${processedData.summary.dateRange}\n`;
  context += `• Используй конкретные цифры и факты из предоставленной информации\n`;
  context += `• Если данных за период нет - честно об этом скажи\n`;
  context += `• ВАЖНО: Используй только поддерживаемые Telegram HTML теги: <b>, <i>, <code>, <pre>\n`;
  context += `• НЕ используй теги <ul>, <ol>, <li> - вместо них используй символы • и цифры\n`;
  context += `• Форматируй списки как обычный текст с символами маркеров\n`;
  context += `• Ограничь длину ответа до 4000 символов\n`;

  return context;
}

/**
 * Очищает неподдерживаемые Telegram HTML теги
 */
function cleanUnsupportedHtmlTags(text: string): string {
  let cleaned = text;

  // Удаляем неподдерживаемые теги и заменяем их на простое форматирование
  cleaned = cleaned.replace(/<ul>/g, '');
  cleaned = cleaned.replace(/<\/ul>/g, '');
  cleaned = cleaned.replace(/<ol>/g, '');
  cleaned = cleaned.replace(/<\/ol>/g, '');
  cleaned = cleaned.replace(/<li>/g, '• ');
  cleaned = cleaned.replace(/<\/li>/g, '\n');

  // Убираем лишние переносы строк
  cleaned = cleaned.replace(/\n\n\n+/g, '\n\n');

  // Ограничиваем длину до 4000 символов
  if (cleaned.length > 4000) {
    cleaned = cleaned.substring(0, 3950) + '...\n\n<i>Ответ сокращен</i>';
  }

  return cleaned.trim();
}
