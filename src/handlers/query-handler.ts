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

  // Активность за период
  if (processedData.recentActivity.length > 0) {
    context += `⏰ АКТИВНОСТЬ ЗА ПЕРИОД:\n`;

    // Группируем по дням для лучшего отображения
    const activityByDate = new Map();
    processedData.recentActivity.forEach((activity: any) => {
      if (!activityByDate.has(activity.date)) {
        activityByDate.set(activity.date, []);
      }
      activityByDate.get(activity.date).push(activity);
    });

    // Выводим по дням
    Array.from(activityByDate.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // Сортируем по дате (новые сначала)
      .slice(0, 10) // Максимум 10 дней
      .forEach(([date, activities]) => {
        context += `\n📅 ${date}:\n`;
        activities.forEach((activity: any, index: number) => {
          const taskNumber = index + 1;
          context += `  ${taskNumber}. ${activity.hours}ч - ${activity.description}\n`;
        });

        const totalHours = activities.reduce((sum: number, a: any) => sum + a.hours, 0);
        context += `  📊 Итого за день: ${totalHours}ч\n`;
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

  // Информация о просрочке
  if (processedData.overdueInfo) {
    context += `⚠️ ИНФОРМАЦИЯ О ПРОСРОЧКЕ:\n`;
    context += `• Сотрудник: ${processedData.overdueInfo.employeeName}\n`;
    context += `• Статус: ${processedData.overdueInfo.hasOverdue ? '❌ Есть просроченные задачи' : '✅ Просроченных задач нет'}\n`;
    context += `• Детали: ${processedData.overdueInfo.details}\n\n`;
  }

  context += `\n💡 ИНСТРУКЦИЯ ДЛЯ АНАЛИЗА:\n`;
  context += `• Все данные уже отфильтрованы по запрашиваемому периоду: ${processedData.summary.dateRange}\n`;
  context += `• ВАЖНО: В ответе используй ТОЧНО тот же период, что указан в запросе пользователя\n`;
  context += `• НЕ меняй год или месяц в ответе - используй данные из запроса\n`;
  context += `• Отвечай только на основе данных за этот период\n`;
  context += `• Используй конкретные цифры и факты из предоставленной информации\n`;
  context += `• Структурируй ответ: общая статистика → детали по сотрудникам → выводы\n`;
  context += `• Вместо "Неизвестная задача" используй "Задача №1", "Задача №2" и т.д.\n`;
  context += `• Если есть информация о просрочке - обязательно включи её в ответ\n`;
  context += `• Если данных за период нет - честно об этом скажи\n`;
  context += `• Используй HTML разметку для форматирования ответа\n`;

  return context;
}
