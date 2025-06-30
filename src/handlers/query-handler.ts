import { Context } from "grammy";
import { DataProcessor } from "../services/DataProcessor";
import { geminiService } from "../services/gemini";

const ANALYSIS_TEMPLATES = {
  productivity: `
🎯 АНАЛИЗ ПРОДУКТИВНОСТИ:
Проанализируй эффективность работы команды:
1. Общее время работы vs количество задач
2. Сравни продуктивность сотрудников
3. Выяви самые времязатратные задачи
4. Дай рекомендации по оптимизации
  `,

  overdue: `
⚠️ АНАЛИЗ ПРОСРОЧЕННЫХ ЗАДАЧ:
Найди проблемы с дедлайнами:
1. Количество и список просроченных задач
2. На сколько дней просрочены
3. У каких сотрудников больше всего просрочек
4. Предложи план устранения просрочек
  `,

  tasks: `
📋 АНАЛИЗ ЗАДАЧ:
Детальный разбор задач команды:
1. Список всех задач за период
2. Статус выполнения каждой задачи
3. Время, потраченное на каждую задачу
4. Рекомендации по планированию
  `,

  time: `
⏰ АНАЛИЗ ВРЕМЕНИ:
Анализ трудозатрат команды:
1. Общее время работы по дням
2. Распределение времени по задачам
3. Пиковые и спокойные периоды
4. Оптимизация временных затрат
  `
};

function validateAndImproveQuery(userQuery: string): string {
  const improvements = [];

  if (userQuery.length < 10) {
    improvements.push("УТОЧНИ: Вопрос слишком общий. Укажи период, сотрудников или конкретные задачи.");
  }

  if (!containsTimeReference(userQuery)) {
    improvements.push("ПЕРИОД: Не указан временной период для анализа.");
  }

  if (improvements.length > 0) {
    return `⚠️ РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ ЗАПРОСА:\n• ${improvements.join('\n• ')}\n\nИСХОДНЫЙ ЗАПРОС: "${userQuery}"\n\n`;
  }

  return `✅ ЗАПРОС: "${userQuery}"\n\n`;
}

function containsTimeReference(query: string): boolean {
  const timeKeywords = [
    'сегодня', 'вчера', 'неделю', 'месяц', 'год', 'день', 'дней',
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
    '2024', '2023', '2025'
  ];

  return timeKeywords.some(keyword => query.toLowerCase().includes(keyword));
}

function getAnalysisTemplate(userQuery: string): string {
  const queryLower = userQuery.toLowerCase();

  if (queryLower.includes('просроч') || queryLower.includes('deadline') || queryLower.includes('срок')) {
    return ANALYSIS_TEMPLATES.overdue;
  }

  if (queryLower.includes('продуктивн') || queryLower.includes('эффективн') || queryLower.includes('производительн')) {
    return ANALYSIS_TEMPLATES.productivity;
  }

  if (queryLower.includes('задач') || queryLower.includes('дел') || queryLower.includes('работ')) {
    return ANALYSIS_TEMPLATES.tasks;
  }

  if (queryLower.includes('время') || queryLower.includes('час') || queryLower.includes('трудозатрат')) {
    return ANALYSIS_TEMPLATES.time;
  }

  return '';
}

function prioritizeDataByQuery(userQuery: string, processedData: any): any {
  const queryLower = userQuery.toLowerCase();

  const focuses = {
    productivity: ['продуктивность', 'эффективность', 'производительность'],
    tasks: ['задач', 'дел', 'работ'],
    time: ['время', 'час', 'трудозатрат'],
    employees: ['сотрудник', 'команд', 'людей'],
    overdue: ['просроченн', 'deadline', 'срок']
  };

  const detectedFocus = Object.entries(focuses).find(([key, keywords]) =>
    keywords.some(keyword => queryLower.includes(keyword))
  )?.[0] || 'general';

  switch(detectedFocus) {
    case 'productivity':
      return prioritizeProductivityData(processedData);
    case 'tasks':
      return prioritizeTasksData(processedData);
    case 'time':
      return prioritizeTimeData(processedData);
    case 'employees':
      return prioritizeEmployeesData(processedData);
    default:
      return processedData;
  }
}

function prioritizeProductivityData(processedData: any): any {
  const sortedEmployees = processedData.employees
    .sort((a: any, b: any) => (b.totalHours / Math.max(b.taskCount, 1)) - (a.totalHours / Math.max(a.taskCount, 1)))
    .slice(0, 5);

  return {
    ...processedData,
    employees: sortedEmployees,
    focus: 'productivity'
  };
}

function prioritizeTasksData(processedData: any): any {
  const sortedEmployees = processedData.employees
    .sort((a: any, b: any) => b.taskCount - a.taskCount)
    .slice(0, 5);

  return {
    ...processedData,
    employees: sortedEmployees,
    topTasks: processedData.topTasks.slice(0, 10),
    focus: 'tasks'
  };
}

function prioritizeTimeData(processedData: any): any {
  const sortedEmployees = processedData.employees
    .sort((a: any, b: any) => b.totalHours - a.totalHours)
    .slice(0, 5);

  return {
    ...processedData,
    employees: sortedEmployees,
    recentActivity: processedData.recentActivity.slice(0, 15),
    focus: 'time'
  };
}

function prioritizeEmployeesData(processedData: any): any {
  return {
    ...processedData,
    employees: processedData.employees.slice(0, 10),
    focus: 'employees'
  };
}

function formatPrioritizedEmployeeData(prioritizedData: any): string {
  let context = '';

  if (prioritizedData.employees.length > 0) {
    const focusTitle = getFocusTitle(prioritizedData.focus);
    context += `👥 ${focusTitle}:\n`;

    prioritizedData.employees.forEach((emp: any, index: number) => {
      context += `\n📋 ${index + 1}. ${emp.name}:\n`;
      context += `• Всего задач: ${emp.taskCount}\n`;
      context += `• Общее время работы: ${emp.totalHours.toFixed(1)} часов\n`;

      if (prioritizedData.focus === 'productivity') {
        const efficiency = emp.taskCount > 0 ? (emp.totalHours / emp.taskCount).toFixed(1) : '0';
        context += `• Эффективность: ${efficiency} часов на задачу\n`;
      }

      if (emp.workTypes.length > 0) {
        context += `• Типы работ: ${emp.workTypes.join(', ')}\n`;
      }

      if (emp.projects.length > 0) {
        context += `• Проекты: ${emp.projects.join(', ')}\n`;
      }

      if (emp.allTasks.length > 0 && prioritizedData.focus === 'tasks') {
        context += `• Последние задачи:\n`;
        emp.allTasks.slice(0, 3).forEach((task: any, taskIndex: number) => {
          context += `  ${taskIndex + 1}. ${task.title} (${task.hours}ч, ${task.date})\n`;
        });
      }

      if (emp.timeEntries.length > 0 && prioritizedData.focus === 'time') {
        context += `• Последние записи времени:\n`;
        emp.timeEntries.slice(0, 3).forEach((entry: any, entryIndex: number) => {
          context += `  ${entryIndex + 1}. ${entry.date}: ${entry.hours}ч - ${entry.description}\n`;
        });
      }
    });
    context += `\n`;
  }

  return context;
}

function getFocusTitle(focus: string): string {
  switch(focus) {
    case 'productivity': return 'АНАЛИЗ ПРОДУКТИВНОСТИ СОТРУДНИКОВ';
    case 'tasks': return 'ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ПО ЗАДАЧАМ';
    case 'time': return 'АНАЛИЗ ТРУДОЗАТРАТ ПО ВРЕМЕНИ';
    case 'employees': return 'ИНФОРМАЦИЯ ПО СОТРУДНИКАМ';
    default: return 'ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ПО СОТРУДНИКАМ';
  }
}

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
 * Форматирует обработанные данные для LLM с улучшенными промптами
 */
function formatDataForLLM(processedData: any, userQuery: string): string {
  let context = `🤖 РОЛЬ: Ты - опытный аналитик данных и менеджер проектов с экспертизой в области документооборота и управления временем.\n\n`;

  context += `🎯 ЗАДАЧА: Проанализируй данные системы документооборота и дай конкретный, структурированный ответ на вопрос пользователя.\n\n`;

  // Валидация и улучшение запроса
  context += validateAndImproveQuery(userQuery);

  context += `📊 ПЕРИОД АНАЛИЗА: ${processedData.summary.dateRange}\n`;
  context += `📅 СЕГОДНЯ: ${new Date().toISOString().split('T')[0]}\n`;
  context += `🎯 СТРАТЕГИЯ: ${processedData.summary.queryStrategy || 'СТАНДАРТНАЯ'}\n`;
  if (processedData.summary.targetEmployee) {
    context += `👤 ЦЕЛЕВОЙ СОТРУДНИК: ${processedData.summary.targetEmployee}\n`;
  }
  context += `\n`;

  // Template для специфических типов анализа
  const template = getAnalysisTemplate(userQuery);
  if (template) {
    context += template + '\n';
  }

  // Специальные инструкции в зависимости от стратегии
  if (processedData.summary.queryStrategy === 'ВСЕ_ДАННЫЕ_СОТРУДНИКА') {
    context += `🔍 ОСОБЫЕ ИНСТРУКЦИИ ДЛЯ АНАЛИЗА СОТРУДНИКА:\n`;
    context += `• В данных содержится ВСЯ информация о сотруднике за весь период\n`;
    context += `• Отвечай только на заданный вопрос, фильтруя данные по смыслу\n`;
    context += `• Если вопрос касается конкретного времени - покажи только те данные\n`;
    context += `• Если вопрос общий - можешь использовать все доступные данные\n\n`;
  } else if (processedData.summary.queryStrategy === 'ПОИСК_НЕИЗВЕСТНОГО_СОТРУДНИКА') {
    context += `🔍 ОСОБЫЕ ИНСТРУКЦИИ ДЛЯ ПОИСКА НЕИЗВЕСТНОГО СОТРУДНИКА:\n`;
    context += `• Пользователь спрашивает о неизвестном/неопознанном сотруднике\n`;
    context += `• Проанализируй ВСЕ данные и найди информацию о сотрудниках\n`;
    context += `• Покажи активность, задачи и время работы всех найденных сотрудников\n`;
    context += `• Помоги пользователю идентифицировать нужного человека\n\n`;
  } else if (processedData.summary.queryStrategy === 'ВСЕ_ДАННЫЕ_ВСЕХ_СОТРУДНИКОВ') {
    context += `🔍 ОСОБЫЕ ИНСТРУКЦИИ ДЛЯ АНАЛИЗА ВСЕХ СОТРУДНИКОВ:\n`;
    context += `• Пользователь спрашивает о всех сотрудниках или общей статистике\n`;
    context += `• Используй ВСЕ доступные данные для полного анализа\n`;
    context += `• Покажи общую картину работы команды\n`;
    context += `• Группируй информацию логично и структурированно\n\n`;
  }

  // Общая статистика
  context += `📊 ДОСТУПНЫЕ ДАННЫЕ:\n`;
  context += `• Всего сотрудников в системе: ${processedData.summary.totalUsers}\n`;
  context += `• Задач для анализа: ${processedData.summary.totalTasks}\n`;
  context += `• Записей времени для анализа: ${processedData.summary.totalTimeEntries}\n`;
  context += `• Проектов: ${processedData.summary.totalProjects}\n\n`;

  // Приоритизированные данные по сотрудникам
  const prioritizedData = prioritizeDataByQuery(userQuery, processedData);
  context += formatPrioritizedEmployeeData(prioritizedData);

  // Пошаговые инструкции для анализа
  context += `\n📋 АЛГОРИТМ ОТВЕТА:\n`;
  context += `1️⃣ КРАТКО: Главный вывод в 1-2 предложениях\n`;
  context += `2️⃣ ДЕТАЛИ: Конкретные цифры и факты\n`;
  context += `3️⃣ ИНСАЙТЫ: Что это означает для команды\n`;
  context += `4️⃣ ДЕЙСТВИЯ: Конкретные рекомендации\n\n`;

  // Примеры качественного анализа
  context += `✨ ПРИМЕРЫ КАЧЕСТВЕННОГО АНАЛИЗА:\n`;
  context += `• Вместо "Все нормально" → "За неделю команда потратила 120 часов, что на 15% больше предыдущей недели"\n`;
  context += `• Вместо "Задач много" → "У Иванова 8 активных задач, 2 из них просрочены на 3 дня"\n`;
  context += `• Всегда указывай конкретные цифры и временные рамки\n\n`;

  // Технические требования к формату
  context += `⚙️ ФОРМАТ ОТВЕТА:\n`;
  context += `• HTML теги: только <b>, <i>, <code>, <pre>\n`;
  context += `• Списки: используй символы • и цифры, НЕ <ul>/<li>\n`;
  context += `• Длина: до 4000 символов\n`;
  context += `• Структура: заголовок → анализ → выводы → рекомендации\n\n`;

  // Дополнительная информация в зависимости от фокуса запроса
  if (prioritizedData.focus === 'time' && processedData.recentActivity.length > 0) {
    context += `⏰ ПОСЛЕДНЯЯ АКТИВНОСТЬ (${Math.min(processedData.recentActivity.length, 15)} записей):\n`;
    processedData.recentActivity.slice(0, 15).forEach((activity: any, index: number) => {
      context += `${index + 1}. ${activity.date}: ${activity.employee} - ${activity.task} (${activity.hours}ч)\n`;
      if (activity.description && activity.description !== activity.task) {
        context += `   ${activity.description}\n`;
      }
    });
    context += `\n`;
  }

  if (prioritizedData.focus === 'tasks' && processedData.topTasks.length > 0) {
    context += `🔥 ТОП ЗАДАЧ ПО ВРЕМЕНИ (${Math.min(processedData.topTasks.length, 10)} задач):\n`;
    processedData.topTasks.slice(0, 10).forEach((task: any, index: number) => {
      context += `${index + 1}. ${task.title} - ${task.hours.toFixed(1)}ч (${task.employee})\n`;
    });
    context += `\n`;
  }

  // Финальные инструкции для LLM
  context += `\n🎯 ФИНАЛЬНЫЕ ИНСТРУКЦИИ:\n`;

  if (processedData.summary.queryStrategy === 'ВСЕ_ДАННЫЕ_СОТРУДНИКА') {
    context += `• СТРАТЕГИЯ: Анализ конкретного сотрудника - используй ВСЕ данные, но отвечай точно на вопрос\n`;
    context += `• Если вопрос про конкретное время - фильтруй данные по этому времени\n`;
    context += `• Если вопрос общий про сотрудника - используй все доступные данные\n`;
  } else if (processedData.summary.queryStrategy === 'ПОИСК_НЕИЗВЕСТНОГО_СОТРУДНИКА') {
    context += `• СТРАТЕГИЯ: Поиск неизвестного сотрудника - анализируй ВСЕ данные и помоги идентифицировать\n`;
    context += `• Покажи всех сотрудников с их активностью для выбора нужного\n`;
  } else if (processedData.summary.queryStrategy === 'ВСЕ_ДАННЫЕ_ВСЕХ_СОТРУДНИКОВ') {
    context += `• СТРАТЕГИЯ: Анализ всех сотрудников - используй ВСЕ данные для полной картины\n`;
    context += `• Группируй и структурируй информацию по всей команде\n`;
  } else {
    context += `• СТРАТЕГИЯ: Общий анализ - данные уже отфильтрованы по периоду: ${processedData.summary.dateRange}\n`;
  }

  context += `• Следуй 4-шаговому алгоритму ответа выше\n`;
  context += `• Используй примеры качественного анализа как образец\n`;
  context += `• Соблюдай технические требования к формату\n`;
  context += `• Если данных недостаточно - предложи уточнить запрос\n`;

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
