import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import { ParsedQuery } from "../types";
import { openRouterService } from "./openrouter";

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    if (config.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
  }

  /**
   * Парсит пользовательский запрос с помощью Gemini (через OpenRouter или напрямую)
   */
  async parseQuery(userQuery: string): Promise<ParsedQuery | null> {
    // Сначала пробуем OpenRouter (более надежный доступ)
    if (openRouterService.isAvailable()) {
      try {
        const result = await openRouterService.parseQuery(userQuery);
        if (result) {
          console.log("Использован OpenRouter (Gemini)");
          return result;
        }
      } catch (error) {
        console.warn("OpenRouter недоступен, пробуем прямой Gemini API:", error instanceof Error ? error.message : String(error));
      }
    }

    // Fallback на прямой Gemini API
    if (!this.model) {
      console.log("Gemini API недоступен");
      return null;
    }

    try {
      const prompt = this.buildParsingPrompt(userQuery);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Парсим JSON ответ от Gemini
      const parsedData = JSON.parse(text);
      console.log("Использован прямой Gemini API");
      return this.validateParsedQuery(parsedData);
    } catch (error) {
      console.error("Ошибка парсинга с прямым Gemini API:", error);
      return null;
    }
  }

  /**
   * Улучшает форматирование ответа с помощью Gemini (через OpenRouter или напрямую)
   */
  async enhanceResponse(data: any[], queryType: string, originalQuery: string): Promise<string | null> {
    // Сначала пробуем OpenRouter
    if (openRouterService.isAvailable()) {
      try {
        const result = await openRouterService.enhanceResponse(data, queryType, originalQuery);
        if (result) {
          console.log("Форматирование через OpenRouter (Gemini)");
          return result;
        }
      } catch (error) {
        console.warn("OpenRouter форматирование недоступно:", error instanceof Error ? error.message : String(error));
      }
    }

    // Fallback на прямой Gemini API
    if (!this.model) {
      return null;
    }

    try {
      const prompt = this.buildFormattingPrompt(data, queryType, originalQuery);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      console.log("Форматирование через прямой Gemini API");
      return response.text();
    } catch (error) {
      console.error("Ошибка форматирования с прямым Gemini API:", error);
      return null;
    }
  }

  /**
   * Создает промпт для парсинга запроса
   */
  private buildParsingPrompt(userQuery: string): string {
    return `
Ты - эксперт по анализу запросов к системе документооборота. 
Проанализируй следующий запрос пользователя и извлеки структурированную информацию.

Запрос: "${userQuery}"

Верни результат ТОЛЬКО в формате JSON без дополнительного текста:
{
  "employee_name": "имя сотрудника или null",
  "project_name": "название проекта или null", 
  "start_date": "дата начала в формате YYYY-MM-DD или null",
  "end_date": "дата окончания в формате YYYY-MM-DD или null",
  "query_type": "tasks|report|projects"
}

Правила:
- employee_name: извлекай русские имена (Кирилл, Артем, Мария и т.д.)
- project_name: названия проектов, коды проектов
- Даты: сегодня = ${new Date().toISOString().split('T')[0]}, вчера = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
- "за неделю" = с ${new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]} по сегодня
- "в этом месяце" = с ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]} по сегодня
- query_type: "tasks" для задач, "report" для отчетов/статистики, "projects" для списка проектов

Примеры:
"Что делал Кирилл сегодня?" → {"employee_name": "Кирилл", "start_date": "${new Date().toISOString().split('T')[0]}", "end_date": "${new Date().toISOString().split('T')[0]}", "query_type": "tasks"}
"Отчет по проекту Alpha за неделю" → {"project_name": "Alpha", "start_date": "${new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]}", "end_date": "${new Date().toISOString().split('T')[0]}", "query_type": "report"}
`;
  }

  /**
   * Создает промпт для форматирования ответа
   */
  private buildFormattingPrompt(data: any[], queryType: string, originalQuery: string): string {
    return `
Ты - помощник по документообороту. Отформатируй данные в удобочитаемый ответ на русском языке.

Исходный запрос: "${originalQuery}"
Тип запроса: ${queryType}
Данные: ${JSON.stringify(data, null, 2)}

Требования к ответу:
- Используй HTML разметку для Telegram (b, i, code)
- Добавь подходящие эмодзи
- Структурируй информацию логично
- Будь кратким но информативным
- Максимум 4000 символов

Для задач (tasks): покажи название, время, дату, описание
Для отчетов (report): покажи статистику, общее время, разбивку по сотрудникам
Для проектов (projects): покажи название, статус, даты

Начни ответ с подходящего заголовка.
`;
  }

  /**
   * Валидирует распарсенный запрос
   */
  private validateParsedQuery(data: any): ParsedQuery {
    return {
      employee_name: data.employee_name || undefined,
      project_name: data.project_name || undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      query_type: data.query_type || "general",
      intent: data.intent || "unknown",
      entities: data.entities || []
    };
  }

  /**
   * Проверяет доступность Gemini API (OpenRouter или прямой)
   */
  isAvailable(): boolean {
    return openRouterService.isAvailable() || this.model !== null;
  }
}

// Экспорт единственного экземпляра
export const geminiService = new GeminiService();
