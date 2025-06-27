import { ParsedQuery } from "../types";
import { geminiService } from "../services/gemini";

/**
 * Парсер пользовательских запросов на естественном языке
 * Использует Gemini API для улучшенного парсинга, fallback на локальный парсер
 */
export async function parseUserQuery(query: string): Promise<ParsedQuery> {
  // Сначала пробуем Gemini
  if (geminiService.isAvailable()) {
    try {
      const geminiResult = await geminiService.parseQuery(query);
      if (geminiResult) {
        console.log("Использован Gemini парсер:", geminiResult);
        return geminiResult;
      }
    } catch (error) {
      console.error("Ошибка Gemini парсера, переключаемся на локальный:", error);
    }
  }

  // Fallback на локальный парсер
  console.log("Использован локальный парсер");
  return parseUserQueryLocal(query);
}

/**
 * Локальный парсер (оригинальная логика)
 */
export function parseUserQueryLocal(query: string): ParsedQuery {
  const normalizedQuery = query.toLowerCase().trim();

  // Извлекаем все возможные сущности
  const employeeName = extractEmployeeName(normalizedQuery);
  const projectName = extractProjectName(normalizedQuery);
  const { startDate, endDate } = extractDates(normalizedQuery);

  // Определяем намерение и сущности
  const intent = determineIntent(normalizedQuery);
  const entities = extractEntities(normalizedQuery);

  return {
    employee_name: employeeName,
    project_name: projectName,
    start_date: startDate,
    end_date: endDate,
    query_type: intent, // Используем намерение как тип
    intent: intent,
    entities: entities
  };
}

/**
 * Определяет тип запроса на основе ключевых слов
 */
/**
 * Определяет намерение пользователя на основе ключевых слов
 */
function determineIntent(query: string): string {
  const intentPatterns = {
    "get_user_list": ["пользователи", "список пользователей", "сотрудники", "список сотрудников", "команда", "кто работает"],
    "get_project_list": ["проекты", "список проектов", "активные проекты", "проекты в работе"],
    "get_task_list": ["задачи", "список задач", "что делал", "что сделал", "работал над"],
    "get_time_report": ["отчет", "отчёт", "сколько часов", "трудозатраты", "время", "статистика"],
    "get_work_types": ["виды работ", "типы работ", "категории работ"],
    "search_project": ["найди проект", "поиск проекта", "проект по названию"],
    "search_user": ["найди пользователя", "поиск пользователя", "кто такой"],
    "get_status": ["статус", "состояние", "как дела"],
    "help": ["помощь", "справка", "как пользоваться", "что умеешь"]
  };

  // Ищем наиболее подходящее намерение
  for (const [intent, keywords] of Object.entries(intentPatterns)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return intent;
    }
  }

  // Если ничего не найдено, пытаемся определить по контексту
  if (query.includes("?") || query.includes("что") || query.includes("как") || query.includes("где")) {
    return "question";
  }

  return "general_query"; // Общий запрос
}

/**
 * Извлекает все возможные сущности из запроса
 */
function extractEntities(query: string): string[] {
  const entities: string[] = [];

  // Временные сущности
  const timeEntities = ["сегодня", "вчера", "завтра", "неделя", "месяц", "год"];
  timeEntities.forEach(entity => {
    if (query.includes(entity)) entities.push(`time:${entity}`);
  });

  // Действия
  const actionEntities = ["делал", "сделал", "работал", "создал", "исправил", "тестировал"];
  actionEntities.forEach(entity => {
    if (query.includes(entity)) entities.push(`action:${entity}`);
  });

  // Объекты
  const objectEntities = ["проект", "задача", "отчет", "документ", "код", "тест"];
  objectEntities.forEach(entity => {
    if (query.includes(entity)) entities.push(`object:${entity}`);
  });

  return entities;
}

/**
 * Извлекает имя сотрудника из запроса
 */
function extractEmployeeName(query: string): string | undefined {
  // Паттерны для поиска имен
  const namePatterns = [
    /(?:что\s+(?:делал|сделал|работал)\s+)([а-яё]+)/i,
    /(?:сотрудник\s+)([а-яё]+)/i,
    /(?:^|\s)([А-ЯЁ][а-яё]+)(?:\s|$)/,
    /(?:у\s+)([а-яё]+)/i,
    /([а-яё]+)(?:\s+(?:делал|сделал|работал))/i
  ];

  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      // Капитализируем первую букву
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }

  return undefined;
}

/**
 * Извлекает название проекта из запроса
 */
function extractProjectName(query: string): string | undefined {
  const projectPatterns = [
    /(?:по\s+проекту\s+)([а-яёa-z0-9_-]+)/i,
    /(?:проект\s+)([а-яёa-z0-9_-]+)/i,
    /(?:над\s+проектом\s+)([а-яёa-z0-9_-]+)/i,
    /(?:в\s+проекте\s+)([а-яёa-z0-9_-]+)/i
  ];

  for (const pattern of projectPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      // Исключаем общие слова
      const excludeWords = ["этом", "том", "потратил", "делал", "сделал"];
      if (!excludeWords.includes(match[1].toLowerCase())) {
        return match[1];
      }
    }
  }

  return undefined;
}

/**
 * Извлекает даты из запроса
 */
function extractDates(query: string): { startDate?: string; endDate?: string } {
  const today = new Date();

  // Относительные даты
  if (query.includes("сегодня")) {
    const todayStr = formatDate(today);
    return { startDate: todayStr, endDate: todayStr };
  }

  if (query.includes("вчера")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    return { startDate: yesterdayStr, endDate: yesterdayStr };
  }

  if (query.includes("на этой неделе") || query.includes("за неделю")) {
    const weekStart = getWeekStart(today);
    return {
      startDate: formatDate(weekStart),
      endDate: formatDate(today)
    };
  }

  if (query.includes("в этом месяце") || query.includes("за месяц")) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: formatDate(monthStart),
      endDate: formatDate(today)
    };
  }

  // Конкретные даты в формате ДД.ММ или ДД.ММ.ГГГГ
  const datePattern = /(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/g;
  const dates: Date[] = [];
  let match;

  while ((match = datePattern.exec(query)) !== null) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // Месяцы в JS начинаются с 0
    const year = match[3] ? parseInt(match[3]) : today.getFullYear();

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      dates.push(new Date(year, month, day));
    }
  }

  if (dates.length === 1) {
    const dateStr = formatDate(dates[0]);
    return { startDate: dateStr, endDate: dateStr };
  } else if (dates.length >= 2) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    return {
      startDate: formatDate(dates[0]),
      endDate: formatDate(dates[dates.length - 1])
    };
  }

  return {};
}

/**
 * Форматирует дату в строку YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Получает начало недели (понедельник)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
  return new Date(d.setDate(diff));
}