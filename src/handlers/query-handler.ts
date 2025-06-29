import { Context } from "grammy";
import { SimpleDocumentAPIAdapter } from "../adapters/SimpleDocumentAPIAdapter";
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

    // Получаем ВСЕ данные из системы ДО
    const allData = await getAllDataFromDO();
    
    console.log("📊 Данные загружены:", {
      users: allData.users.length,
      projects: allData.projects.length,
      tasks: allData.tasks.length,
      timeEntries: allData.timeEntries.length
    });

    // Отправляем в LLM для анализа
    const response = await analyzeWithLLM(userQuery, allData);
    
    await ctx.reply(response, { parse_mode: "HTML" });

  } catch (error) {
    console.error("❌ Ошибка:", error);
    await ctx.reply("❌ Произошла ошибка при обработке запроса.");
  }
}

/**
 * Получает ВСЕ данные из системы документооборота
 */
async function getAllDataFromDO() {
  const adapter = new SimpleDocumentAPIAdapter();
  return await adapter.loadAllData();
}

/**
 * Анализирует запрос с помощью LLM
 */
async function analyzeWithLLM(userQuery: string, allData: any): Promise<string> {
  console.log("🧠 Отправляем в LLM...");

  try {
    // Формируем простой и понятный контекст
    const context = formatDataForLLM(allData, userQuery);

    // Отправляем в LLM
    const response = await geminiService.enhanceResponse([{ context }], "data_analysis", userQuery);

    if (response) {
      console.log("✅ LLM проанализировал данные");
      return response;
    } else {
      console.log("⚠️ LLM недоступен, fallback");
      return createSmartFallback(userQuery, allData);
    }

  } catch (error) {
    console.error("❌ Ошибка LLM:", error);
    return createSmartFallback(userQuery, allData);
  }
}

/**
 * Форматирует данные в понятном для LLM виде с учетом временных периодов
 */
function formatDataForLLM(allData: any, userQuery: string): string {
  // Анализируем временной период в запросе
  const timeFilter = analyzeTimeFilter(userQuery);

  // Фильтруем данные по времени
  const filteredData = filterDataByTime(allData, timeFilter);

  let context = `ВОПРОС: "${userQuery}"\n`;
  context += `СЕГОДНЯ: ${new Date().toISOString().split('T')[0]}\n`;
  context += `АНАЛИЗ ПЕРИОДА: ${timeFilter.description}\n\n`;

  // Форматируем отфильтрованные трудозатраты
  context += `ТРУДОЗАТРАТЫ ЗА УКАЗАННЫЙ ПЕРИОД:\n\n`;

  if (filteredData.timeEntries.length === 0) {
    context += `❌ Нет записей трудозатрат за ${timeFilter.description.toLowerCase()}\n\n`;

    // Определяем упомянутых пользователей в запросе
    const mentionedUsers = findMentionedUsers(userQuery, allData.users);

    if (mentionedUsers.length > 0) {
      // Показываем последние данные конкретных пользователей
      context += `ПОСЛЕДНИЕ ДОСТУПНЫЕ ДАННЫЕ ДЛЯ УПОМЯНУТЫХ ПОЛЬЗОВАТЕЛЕЙ:\n\n`;

      mentionedUsers.forEach(userName => {
        const userEntries = allData.timeEntries.filter((entry: any) =>
          entry.employee_name === userName
        ).slice(0, 3);

        if (userEntries.length > 0) {
          context += `${userName}:\n`;
          userEntries.forEach((entry: any, index: number) => {
            context += `   ${index + 1}. Работа: ${entry.description}\n`;
            context += `      Время: ${entry.hours} часов\n`;
            context += `      Дата: ${entry.date}\n\n`;
          });
        } else {
          context += `${userName}: Нет доступных данных\n\n`;
        }
      });
    } else {
      // Показываем общие последние данные
      context += `ПОСЛЕДНИЕ ДОСТУПНЫЕ ДАННЫЕ:\n\n`;
      allData.timeEntries.slice(0, 3).forEach((entry: any, index: number) => {
        context += `${index + 1}. ${entry.employee_name}\n`;
        context += `   Работа: ${entry.description}\n`;
        context += `   Время: ${entry.hours} часов\n`;
        context += `   Дата: ${entry.date}\n\n`;
      });
    }
  } else {
    filteredData.timeEntries.forEach((entry: any, index: number) => {
      context += `${index + 1}. ${entry.employee_name}\n`;
      context += `   Работа: ${entry.description}\n`;
      context += `   Время: ${entry.hours} часов\n`;
      context += `   Дата: ${entry.date}\n\n`;
    });
  }

  // Добавляем задачи
  context += `ЗАДАЧИ СОТРУДНИКОВ:\n\n`;
  allData.tasks.forEach((task: any, index: number) => {
    context += `${index + 1}. ${task.employee_name}\n`;
    context += `   Задача: ${task.title}\n`;
    context += `   Срок: ${task.date}\n\n`;
  });

  // Добавляем пользователей
  context += `СПИСОК СОТРУДНИКОВ:\n`;
  allData.users.forEach((user: any, index: number) => {
    context += `${index + 1}. ${user.name}\n`;
  });

  context += `\nИНСТРУКЦИЯ:
- Ответь на вопрос используя ТОЛЬКО эти данные
- ОБЯЗАТЕЛЬНО учитывай временной период: ${timeFilter.description}
- Если данных за период нет - честно скажи об этом
- Покажи последние доступные данные если нужно
- Используй HTML разметку: <b>жирный</b>, <i>курсив</i>
- Добавь эмодзи
- Будь точным с датами и периодами`;

  return context;
}

/**
 * Умный fallback который анализирует данные локально
 */
function createSmartFallback(userQuery: string, allData: any): string {
  const query = userQuery.toLowerCase();

  // Ищем упоминания имен в запросе
  const mentionedNames: string[] = [];
  allData.users.forEach((user: any) => {
    const firstName = user.name.split(' ')[0].toLowerCase();
    if (query.includes(firstName)) {
      mentionedNames.push(user.name);
    }
  });

  if (mentionedNames.length > 0) {
    // Если упомянуты конкретные люди - показываем их трудозатраты
    let response = `📊 <b>Трудозатраты сотрудников</b>\n\n`;

    mentionedNames.forEach(name => {
      const userEntries = allData.timeEntries.filter((entry: any) =>
        entry.employee_name === name
      );

      if (userEntries.length > 0) {
        const totalHours = userEntries.reduce((sum: number, entry: any) => sum + entry.hours, 0);

        response += `👤 <b>${name}</b>\n`;
        response += `⏱️ Общее время: <b>${totalHours} часов</b>\n\n`;

        userEntries.forEach((entry: any, index: number) => {
          response += `${index + 1}. ${entry.description}\n`;
          response += `   🕐 ${entry.hours} ч. | 📅 ${entry.date}\n\n`;
        });

        response += `\n`;
      } else {
        response += `👤 <b>${name}</b>\n`;
        response += `❌ Данные о трудозатратах не найдены\n\n`;
      }
    });

    return response;
  }

  // Общий fallback
  return `📊 <b>Данные системы документооборота</b>

По запросу: <i>"${userQuery}"</i>

📈 <b>Доступная информация:</b>
👥 Пользователи: ${allData.users.length}
🏗️ Проекты: ${allData.projects.length}
📋 Задачи: ${allData.tasks.length}
⏱️ Записи времени: ${allData.timeEntries.length}
⚙️ Виды работ: ${allData.workTypes.length}

💡 <i>Попробуйте спросить о конкретном сотруднике</i>

Примеры:
• "Что делал Артем?"
• "Трудозатраты Кирилла"
• "Сколько часов работал Сергей?"`;
}

/**
 * Анализирует временной период в запросе пользователя
 */
function analyzeTimeFilter(userQuery: string): {
  startDate: string;
  endDate: string;
  description: string;
} {
  const query = userQuery.toLowerCase();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // За неделю
  if (query.includes('за неделю') || query.includes('на неделе') || query.includes('за последнюю неделю')) {
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: todayStr,
      description: 'последнюю неделю (7 дней)'
    };
  }

  // За месяц
  if (query.includes('за месяц') || query.includes('в этом месяце') || query.includes('за последний месяц')) {
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      startDate: monthAgo.toISOString().split('T')[0],
      endDate: todayStr,
      description: 'последний месяц (30 дней)'
    };
  }

  // Сегодня
  if (query.includes('сегодня') || query.includes('за сегодня')) {
    return {
      startDate: todayStr,
      endDate: todayStr,
      description: 'сегодня'
    };
  }

  // Вчера
  if (query.includes('вчера') || query.includes('за вчера')) {
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return {
      startDate: yesterdayStr,
      endDate: yesterdayStr,
      description: 'вчера'
    };
  }

  // За 3 дня, за 5 дней и т.д.
  const daysMatch = query.match(/за (\d+) дн/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const daysAgo = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      startDate: daysAgo.toISOString().split('T')[0],
      endDate: todayStr,
      description: `последние ${days} дней`
    };
  }

  // По умолчанию - весь доступный период
  return {
    startDate: '2025-01-01',
    endDate: todayStr,
    description: 'весь доступный период'
  };
}

/**
 * Фильтрует данные по временному периоду
 */
function filterDataByTime(allData: any, timeFilter: any): any {
  const filteredTimeEntries = allData.timeEntries.filter((entry: any) => {
    return entry.date >= timeFilter.startDate && entry.date <= timeFilter.endDate;
  });

  const filteredTasks = allData.tasks.filter((task: any) => {
    return task.date >= timeFilter.startDate && task.date <= timeFilter.endDate;
  });

  return {
    ...allData,
    timeEntries: filteredTimeEntries,
    tasks: filteredTasks
  };
}

/**
 * Находит упомянутых в запросе пользователей
 */
function findMentionedUsers(userQuery: string, users: any[]): string[] {
  const query = userQuery.toLowerCase();
  const mentionedUsers: string[] = [];

  users.forEach((user: any) => {
    const firstName = user.name.split(' ')[0].toLowerCase();
    if (query.includes(firstName)) {
      mentionedUsers.push(user.name);
    }
  });

  return mentionedUsers;
}
