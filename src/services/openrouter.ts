import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { ParsedQuery } from "../types";

export class OpenRouterService {
  private client: AxiosInstance | null = null;
  private parseCache = new Map<string, ParsedQuery>(); // Кэш для парсинга
  private formatCache = new Map<string, string>(); // Кэш для форматирования

  constructor() {
    if (config.OPENROUTER_API_KEY) {
      this.client = axios.create({
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/your-repo', // Optional: for analytics
          'X-Title': 'Telegram Bot Document Management' // Optional: for analytics
        },
        timeout: 30000
      });
    }
  }

  /**
   * Парсит пользовательский запрос с помощью Gemini через OpenRouter
   */
  async parseQuery(userQuery: string): Promise<ParsedQuery | null> {
    if (!this.client) {
      console.log("OpenRouter API недоступен");
      return null;
    }

    // Проверяем кэш
    const cacheKey = userQuery.toLowerCase().trim();
    if (this.parseCache.has(cacheKey)) {
      console.log("🚀 Использован кэш парсинга");
      return this.parseCache.get(cacheKey)!;
    }

    // Для простых запросов используем локальный парсер (экономим токены)
    if (this.isSimpleQuery(userQuery)) {
      console.log("⚡ Простой запрос - используем локальный парсер");
      return null; // Fallback на локальный парсер
    }

    try {
      const prompt = this.buildParsingPrompt(userQuery);
      
      const response = await this.client.post('/chat/completions', {
        model: 'google/gemini-2.5-flash-lite-preview-06-17',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Низкая температура для более предсказуемых результатов
        max_tokens: 500
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        console.error("Пустой ответ от OpenRouter");
        return null;
      }

      // Парсим JSON ответ от Gemini (убираем markdown форматирование)
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedData = JSON.parse(cleanContent);
      const result = this.validateParsedQuery(parsedData);

      // Сохраняем в кэш
      this.parseCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Ошибка парсинга с OpenRouter:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Улучшает форматирование ответа с помощью Gemini через OpenRouter
   */
  async enhanceResponse(data: any[], queryType: string, originalQuery: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const prompt = this.buildFormattingPrompt(data, queryType, originalQuery);
      
      const response = await this.client.post('/chat/completions', {
        model: 'google/gemini-2.5-flash-lite-preview-06-17',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Немного выше для более креативного форматирования
        max_tokens: 2000
      });

      const content = response.data.choices[0]?.message?.content;
      return content || null;
    } catch (error) {
      console.error("Ошибка форматирования с OpenRouter:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Создает промпт для парсинга запроса
   */
  private buildParsingPrompt(userQuery: string): string {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    return `Парсинг запроса: "${userQuery}"

JSON:
{
  "employee_name": "имя или null",
  "project_name": "проект или null",
  "start_date": "YYYY-MM-DD или null",
  "end_date": "YYYY-MM-DD или null",
  "query_type": "краткое описание",
  "intent": "действие",
  "entities": ["ключевые", "слова"]
}

Даты: сегодня=${today}, вчера=${yesterday}
Интенты: get_users, get_tasks, get_projects, get_report, search, help`;
  }

  /**
   * Создает промпт для форматирования ответа
   */
  private buildFormattingPrompt(data: any[], queryType: string, originalQuery: string): string {
    return `ВАЖНО: Используй ТОЛЬКО данные из JSON. НЕ придумывай новую информацию!

Запрос: "${originalQuery}"
Данные: ${JSON.stringify(data, null, 2)}

Задача: Отформатируй ТОЛЬКО эти данные для Telegram:
- HTML: <b>жирный</b>, <i>курсив</i>, <code>код</code>
- Эмодзи для красоты
- Структурированно
- НЕ добавляй данные, которых нет в JSON
- НЕ придумывай цифры, даты, проекты
- Используй только то, что есть в данных

Если данных мало - так и напиши. Не выдумывай!`;
  }

  /**
   * Проверяет, является ли запрос простым (можно обработать локально)
   */
  private isSimpleQuery(query: string): boolean {
    const simplePatterns = [
      /^список (пользователей|сотрудников|проектов)$/i,
      /^(пользователи|сотрудники|проекты)$/i,
      /^помощь$/i,
      /^статус$/i,
      /^что умеешь\??$/i
    ];

    return simplePatterns.some(pattern => pattern.test(query.trim()));
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
   * Проверяет доступность OpenRouter API
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

// Экспорт единственного экземпляра
export const openRouterService = new OpenRouterService();
