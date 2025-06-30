export class NameExtractor {
  private llmService: any;

  constructor(llmService?: any) {
    this.llmService = llmService;
  }

  async extractEmployeeName(query: string): Promise<string | null> {
    try {
      console.log(`🧠 Извлекаем имя сотрудника из запроса: "${query}"`);

      const prompt = `
Задача: Извлечь имя сотрудника из запроса пользователя.

Запрос пользователя: "${query}"

Инструкции:
1. Найди в запросе имя, фамилию или отчество сотрудника
2. Верни ТОЛЬКО найденное имя/фамилию/отчество
3. Если имен несколько - верни первое найденное
4. Если имени нет - верни "НЕТ"

Примеры:
- "Что делал Кирилл вчера?" → "Кирилл"
- "Задачи Червоткина" → "Червоткин"  
- "Сколько работал Иван Петров?" → "Иван Петров"
- "Список всех сотрудников" → "НЕТ"
- "Статистика по проектам" → "НЕТ"

Ответ (только имя или "НЕТ"):`;

      if (!this.llmService || !this.llmService.generateResponse) {
        console.log(`⚠️ LLM сервис недоступен, используем простое извлечение`);
        return this.extractEmployeeNameSimple(query);
      }

      const response = await this.llmService.generateResponse(prompt, {
        temperature: 0.1,
        maxTokens: 50
      });

      const extractedName = response.trim();
      
      if (extractedName === "НЕТ" || extractedName.toLowerCase() === "нет") {
        console.log(`❌ ИИ не нашел имя сотрудника в запросе`);
        return null;
      }

      console.log(`✅ ИИ извлек имя: "${extractedName}"`);
      return extractedName;

    } catch (error) {
      console.error('❌ Ошибка извлечения имени через ИИ:', error);
      return null;
    }
  }

  // Fallback метод - простое извлечение по паттернам
  extractEmployeeNameSimple(query: string): string | null {
    console.log(`🔍 Простое извлечение имени из: "${query}"`);
    
    const queryLower = query.toLowerCase();
    
    // Паттерны для поиска имен (исключаем служебные слова)
    const namePatterns = [
      // Полные имена (Фамилия Имя Отчество)
      /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/g,
      // Имя Фамилия
      /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/g,
      // Отдельные имена (минимум 4 буквы, исключаем короткие служебные слова)
      /([А-ЯЁ][а-яё]{3,})/g
    ];

    // Служебные слова, которые нужно исключить
    const excludeWords = [
      'что', 'кто', 'где', 'когда', 'как', 'почему', 'зачем', 'откуда', 'куда',
      'делал', 'делает', 'работал', 'работает', 'задач', 'время', 'часов',
      'вчера', 'сегодня', 'завтра', 'неделе', 'месяце', 'году', 'дней'
    ];

    for (const pattern of namePatterns) {
      const matches = query.match(pattern);
      if (matches && matches.length > 0) {
        // Проверяем каждое найденное совпадение
        for (const match of matches) {
          const name = match.trim();
          const nameLower = name.toLowerCase();

          // Исключаем служебные слова
          if (!excludeWords.includes(nameLower)) {
            console.log(`✅ Найдено имя: "${name}"`);
            return name;
          } else {
            console.log(`⚠️ Пропускаем служебное слово: "${name}"`);
          }
        }
      }
    }

    console.log(`❌ Имя не найдено в запросе`);
    return null;
  }

  // Гибридный метод - сначала ИИ, потом fallback
  async extractName(query: string): Promise<string | null> {
    // Сначала пробуем ИИ
    const aiResult = await this.extractEmployeeName(query);
    if (aiResult) {
      return aiResult;
    }

    // Если ИИ не помог - используем простые паттерны
    console.log(`🔄 ИИ не помог, используем простое извлечение`);
    return this.extractEmployeeNameSimple(query);
  }
}
