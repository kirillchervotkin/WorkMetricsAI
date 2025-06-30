import { SimpleDocumentAPIAdapter } from "../adapters/SimpleDocumentAPIAdapter";
import { NameExtractor } from './NameExtractor';

export interface ProcessedData {
  summary: {
    totalUsers: number;
    totalTasks: number;
    totalTimeEntries: number;
    totalProjects: number;
    dateRange: string;
    queryStrategy?: string;
    targetEmployee?: string;
  };
  employees: Array<{
    name: string;
    id: string;
    taskCount: number;
    totalHours: number;
    recentTasks: string[];
    allTasks: Array<{
      title: string;
      description: string;
      date: string;
      hours: number;
      status: string;
    }>;
    workTypes: string[];
    projects: string[];
    timeEntries: Array<{
      date: string;
      hours: number;
      description: string;
      taskId: string;
      projectId: string;
      workType: string;
    }>;
  }>;
  recentActivity: Array<{
    date: string;
    employee: string;
    task: string;
    hours: number;
    description: string;
  }>;
  topTasks: Array<{
    title: string;
    employee: string;
    hours: number;
    status: string;
  }>;
}

export class DataProcessor {
  private adapter: SimpleDocumentAPIAdapter;
  private nameExtractor: NameExtractor;

  constructor(llmService?: any) {
    this.adapter = new SimpleDocumentAPIAdapter();
    this.nameExtractor = new NameExtractor(llmService);
  }

  // Новый простой метод обработки запросов
  async processQuery(userQuery: string): Promise<ProcessedData> {
    console.log(`🔍 Простая обработка запроса: "${userQuery}"`);

    // 1. Извлекаем имя сотрудника через ИИ
    const extractedName = await this.nameExtractor.extractName(userQuery);

    if (extractedName) {
      console.log(`👤 Найдено имя сотрудника: "${extractedName}"`);

      // 2. Ищем сотрудника по имени и получаем userId
      const userResponse = await this.adapter.findUserByName(extractedName);

      if (userResponse.success && userResponse.data.length > 0) {
        const employee = userResponse.data[0];
        console.log(`✅ Найден сотрудник: ${employee.name} (ID: ${employee.id})`);

        // 3. Загружаем ВСЕ данные сотрудника по userId
        const rawData = await this.adapter.loadAllData({
          employee_name: employee.name,
          start_date: '2020-01-01', // Загружаем за весь период
          end_date: new Date().toISOString().split('T')[0],
          query: userQuery
        });

        console.log(`📊 Загружены данные сотрудника:`, {
          tasks: rawData.tasks.length,
          timeEntries: rawData.timeEntries.length,
          projects: rawData.projects.length
        });

        // 4. Возвращаем данные для ИИ (без фильтрации)
        return this.createProcessedData(rawData, employee.name, userQuery);

      } else {
        console.log(`❌ Сотрудник "${extractedName}" не найден в системе`);
      }
    } else {
      console.log(`👥 Имя не найдено - обрабатываем как общий запрос`);

      // Загружаем общие данные
      const rawData = await this.adapter.loadAllData({
        query: userQuery
      });

      return this.createProcessedData(rawData, null, userQuery);
    }

    // Fallback - пустые данные
    return this.createEmptyProcessedData(userQuery);
  }

  // Вспомогательные методы
  private createProcessedData(rawData: any, employeeName: string | null, userQuery: string): ProcessedData {
    const employees = this.groupByEmployee(rawData);
    const recentActivity = this.getRecentActivity(rawData, 100);
    const topTasks = this.getTopTasks(rawData, 50);

    return {
      summary: {
        totalUsers: rawData.users.length,
        totalTasks: rawData.tasks.length,
        totalTimeEntries: rawData.timeEntries.length,
        totalProjects: rawData.projects.length,
        dateRange: 'за весь доступный период',
        queryStrategy: employeeName ? 'ВСЕ_ДАННЫЕ_СОТРУДНИКА' : 'ОБЩИЙ_ЗАПРОС',
        targetEmployee: employeeName || 'ВСЕ_СОТРУДНИКИ'
      },
      employees,
      recentActivity,
      topTasks
    };
  }

  private createEmptyProcessedData(userQuery: string): ProcessedData {
    return {
      summary: {
        totalUsers: 0,
        totalTasks: 0,
        totalTimeEntries: 0,
        totalProjects: 0,
        dateRange: 'нет данных',
        queryStrategy: 'ОШИБКА',
        targetEmployee: 'НЕ_НАЙДЕН'
      },
      employees: [],
      recentActivity: [],
      topTasks: []
    };
  }

  async processQueryData(userQuery: string): Promise<ProcessedData> {
    console.log('🔍 Анализируем запрос для умной загрузки данных...');

    // Сначала загружаем всех сотрудников
    console.log('👥 Загружаем список всех сотрудников...');
    const allEmployees = await this.adapter.getAllEmployees();

    if (!allEmployees.success || allEmployees.data.length === 0) {
      console.log('❌ Не удалось загрузить сотрудников');
      throw new Error('Не удалось загрузить список сотрудников');
    }

    console.log(`✅ Загружено сотрудников: ${allEmployees.data.length}`);

    // Анализируем запрос с учетом реальных имен сотрудников
    const queryContext = this.analyzeQuery(userQuery, allEmployees.data);
    console.log('📊 Контекст запроса:', queryContext);

    // Загружаем только релевантные данные
    const rawData = await this.loadRelevantData(queryContext);

    // Добавляем список всех сотрудников в данные
    rawData.users = allEmployees.data;

    // Обрабатываем и агрегируем данные
    const processedData = this.aggregateData(rawData, queryContext);

    console.log('✅ Данные обработаны для LLM:', {
      employees: processedData.employees.length,
      recentActivity: processedData.recentActivity.length,
      topTasks: processedData.topTasks.length
    });

    return processedData;
  }

  private analyzeQuery(query: string, employees: any[]) {
    const queryLower = query.toLowerCase();

    return {
      employeeName: this.extractEmployeeName(queryLower, employees),
      timeframe: this.extractTimeframe(queryLower),
      queryType: this.detectQueryType(queryLower),
      needsDetailed: queryLower.includes('подробно') || queryLower.includes('детально'),
      needsStats: queryLower.includes('статистика') || queryLower.includes('сколько') || queryLower.includes('количество')
    };
  }

  private extractEmployeeName(query: string, employees: any[]): string | undefined {
    console.log('🔍 Ищем имя сотрудника в запросе:', query);
    console.log('📋 Доступные сотрудники:', employees.map(e => e.name).slice(0, 5), '...');

    // Сначала ищем точные совпадения с именами из базы
    for (const employee of employees) {
      const fullName = employee.name.toLowerCase();
      const nameParts = fullName.split(' ');

      // Проверяем полное имя
      if (query.includes(fullName)) {
        console.log('✅ Найдено полное имя:', employee.name);
        return employee.name;
      }

      // Проверяем части имени (имя, фамилия, отчество)
      for (const part of nameParts) {
        if (part.length > 2 && query.includes(part)) {
          console.log('✅ Найдена часть имени:', part, '→', employee.name);
          return employee.name;
        }
      }
    }

    // Если точных совпадений нет, ищем по паттернам
    const namePatterns = [
      // Полные имена (Фамилия Имя Отчество)
      /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/g,
      // Имя Фамилия
      /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/g,
      // Отдельные имена (любые с заглавной буквы)
      /([А-ЯЁ][а-яё]{2,})/g,
      // Английские имена
      /([A-Z][a-z]{2,})/g
    ];

    for (const pattern of namePatterns) {
      const matches = query.match(pattern);
      if (matches && matches.length > 0) {
        const foundName = matches[0].trim();
        console.log('🔍 Найден паттерн имени:', foundName);

        // Ищем похожее имя в базе
        for (const employee of employees) {
          if (employee.name.toLowerCase().includes(foundName.toLowerCase())) {
            console.log('✅ Найдено похожее имя:', foundName, '→', employee.name);
            return employee.name;
          }
        }
      }
    }

    // Проверяем специальные случаи
    if (query.includes('неизвестн') || query.includes('незнаком') || query.includes('кто-то') ||
        query.includes('кто то') || query.includes('некто') || query.includes('один из')) {
      console.log('🔍 Обнаружен запрос о неизвестном сотруднике - используем стратегию полных данных');
      return 'НЕИЗВЕСТНЫЙ_СОТРУДНИК';
    }

    // Проверяем запросы о списке/перечислении сотрудников
    if (query.includes('назови') && (query.includes('сотрудник') || query.includes('людей') || query.includes('команд')) ||
        query.includes('перечисли') || query.includes('список') && query.includes('сотрудник') ||
        query.includes('кто работает') || query.includes('кто есть') || query.includes('какие сотрудники') ||
        query.includes('все') || query.includes('всех') || query.includes('каждый') ||
        query.includes('любой') || (query.includes('сотрудник') && !query.includes('конкретн'))) {
      console.log('🔍 Обнаружен запрос о списке сотрудников - используем стратегию полных данных');
      return 'ВСЕ_СОТРУДНИКИ';
    }

    console.log('❌ Имя сотрудника не найдено в запросе');
    return undefined;
  }

  private extractTimeframe(query: string) {
    const today = new Date();
    console.log('🔍 Анализируем временной период в запросе:', query);

    // Извлекаем год из запроса
    const yearMatch = query.match(/(\d{4})\s*год/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    console.log('📅 Найден год:', year);

    // Извлекаем месяц из запроса
    const monthNames = {
      'январ': 0, 'янв': 0,
      'феврал': 1, 'фев': 1,
      'март': 2, 'мар': 2,
      'апрел': 3, 'апр': 3,
      'май': 4, 'мая': 4,
      'июн': 5, 'июня': 5,
      'июл': 6, 'июля': 6,
      'август': 7, 'авг': 7,
      'сентябр': 8, 'сен': 8,
      'октябр': 9, 'окт': 9,
      'ноябр': 10, 'ноя': 10,
      'декабр': 11, 'дек': 11
    };

    let month = null;
    let monthName = '';
    for (const [name, index] of Object.entries(monthNames)) {
      if (query.includes(name)) {
        month = index;
        monthName = name;
        break;
      }
    }
    console.log('📅 Найден месяц:', monthName, '→', month);

    // Если найден конкретный месяц и год
    if (month !== null && year !== null) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Последний день месяца

      console.log('✅ Период:', startDate.toISOString().split('T')[0], '→', endDate.toISOString().split('T')[0]);

      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        label: `${monthName} ${year} года`
      };
    }

    // Если найден только месяц (текущий год)
    if (month !== null) {
      const currentYear = today.getFullYear();
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0);

      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        label: `${monthName} ${currentYear} года`
      };
    }

    // Если найден только год
    if (year !== null) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        label: `${year} год`
      };
    }

    // Стандартные периоды
    if (query.includes('вчера')) {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0],
        label: 'вчера'
      };
    }

    if (query.includes('сегодня')) {
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
        label: 'сегодня'
      };
    }

    if (query.includes('неделю') || query.includes('неделе')) {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: weekAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
        label: 'за неделю'
      };
    }

    if (query.includes('месяц')) {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        start: monthAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
        label: 'за месяц'
      };
    }

    // По умолчанию - ВСЕ доступные данные (за последний год)
    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    console.log('⚠️ Используем период по умолчанию');
    return {
      start: yearAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      label: 'за весь доступный период'
    };
  }

  private detectQueryType(query: string): string {
    if (query.includes('что делал') || query.includes('работал над')) return 'activity';
    if (query.includes('сколько') || query.includes('количество')) return 'statistics';
    if (query.includes('задач') || query.includes('задачи')) return 'tasks';
    if (query.includes('время') || query.includes('часов')) return 'time';
    if (query.includes('проект') || query.includes('проекты')) return 'projects';
    return 'general';
  }

  private async loadRelevantData(context: any) {
    // Загружаем ВСЕ доступные данные без ограничений по времени
    const limits = {
      tasks: context.employeeName ? 1000 : 500, // Максимум данных
      timeEntries: context.employeeName ? 2000 : 1000, // Максимум записей времени
      projects: 100 // Все проекты
    };

    console.log('📥 Загружаем ВСЕ доступные данные с лимитами:', limits);
    console.log('🔍 Запрашиваемый период для фильтрации:', context.timeframe);

    // Загружаем данные за весь период (без фильтрации по времени)
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 2); // За 2 года

    return await this.adapter.loadAllData({
      employee_name: context.employeeName,
      start_date: yearAgo.toISOString().split('T')[0], // Загружаем за 2 года
      end_date: new Date().toISOString().split('T')[0], // До сегодня
      ...limits
    });
  }

  private aggregateData(rawData: any, context: any): ProcessedData {
    console.log('🔄 Подготавливаем данные для анализа:', context.timeframe);

    // Определяем стратегию обработки данных
    let dataToProcess;
    let strategy;

    if (context.employeeName &&
        !['НЕИЗВЕСТНЫЙ_СОТРУДНИК', 'ВСЕ_СОТРУДНИКИ'].includes(context.employeeName)) {
      console.log(`👤 Запрос о конкретном сотруднике: ${context.employeeName}`);
      console.log('📊 Используем ВСЕ данные сотрудника, LLM отфильтрует по вопросу');
      dataToProcess = rawData; // Все данные без временной фильтрации
      strategy = 'ВСЕ_ДАННЫЕ_СОТРУДНИКА';
    } else if (context.employeeName === 'НЕИЗВЕСТНЫЙ_СОТРУДНИК') {
      console.log('🔍 Запрос о неизвестном сотруднике - используем ВСЕ данные для поиска');
      console.log('📊 LLM сам найдет и покажет информацию о неизвестном сотруднике');
      dataToProcess = rawData; // Все данные для поиска
      strategy = 'ПОИСК_НЕИЗВЕСТНОГО_СОТРУДНИКА';
    } else if (context.employeeName === 'ВСЕ_СОТРУДНИКИ') {
      console.log('👥 Общий запрос о всех сотрудниках - используем ВСЕ данные');
      console.log('📊 LLM покажет информацию по всем сотрудникам');
      dataToProcess = rawData; // Все данные
      strategy = 'ВСЕ_ДАННЫЕ_ВСЕХ_СОТРУДНИКОВ';
    } else {
      console.log('👥 Стандартный запрос - применяем временную фильтрацию');
      dataToProcess = this.filterDataByTimeframe(rawData, context.timeframe);
      strategy = 'ВРЕМЕННАЯ_ФИЛЬТРАЦИЯ';
    }

    console.log('📊 Данные для обработки:', {
      allTasks: rawData.tasks.length,
      processedTasks: dataToProcess.tasks.length,
      allTimeEntries: rawData.timeEntries.length,
      processedTimeEntries: dataToProcess.timeEntries.length,
      strategy: strategy
    });

    // Группируем данные по сотрудникам
    const employeeStats = this.groupByEmployee(dataToProcess);

    // Получаем активность
    const recentActivity = this.getRecentActivity(dataToProcess, 100);

    // Топ задачи
    const topTasks = this.getTopTasks(dataToProcess, 50);

    return {
      summary: {
        totalUsers: rawData.users.length, // Общее количество пользователей
        totalTasks: dataToProcess.tasks.length, // Задачи для анализа
        totalTimeEntries: dataToProcess.timeEntries.length, // Записи времени для анализа
        totalProjects: dataToProcess.projects.length, // Проекты для анализа
        dateRange: context.timeframe.label,
        queryStrategy: strategy,
        targetEmployee: context.employeeName || 'ВСЕ_СОТРУДНИКИ'
      },
      employees: employeeStats,
      recentActivity,
      topTasks
    };
  }

  // Фильтрует данные по временному диапазону
  private filterDataByTimeframe(rawData: any, timeframe: any) {
    const startDate = timeframe.start;
    const endDate = timeframe.end;

    console.log(`🗓️ Фильтруем данные с ${startDate} по ${endDate}`);

    // Фильтруем записи времени по дате
    const filteredTimeEntries = rawData.timeEntries.filter((entry: any) => {
      return entry.date >= startDate && entry.date <= endDate;
    });

    // Фильтруем задачи по дате
    const filteredTasks = rawData.tasks.filter((task: any) => {
      return task.date >= startDate && task.date <= endDate;
    });

    // Проекты оставляем все (они не привязаны к конкретным датам)
    const filteredProjects = rawData.projects;

    return {
      ...rawData,
      tasks: filteredTasks,
      timeEntries: filteredTimeEntries,
      projects: filteredProjects
    };
  }

  private groupByEmployee(rawData: any) {
    const employeeMap = new Map();

    // Группируем задачи по сотрудникам с полной детализацией
    rawData.tasks.forEach((task: any) => {
      const employeeName = this.findEmployeeName(task.employee_id, rawData.users);
      if (!employeeMap.has(employeeName)) {
        employeeMap.set(employeeName, {
          name: employeeName,
          id: task.employee_id,
          taskCount: 0,
          totalHours: 0,
          recentTasks: [],
          allTasks: [], // Все задачи с деталями
          workTypes: new Set(), // Типы работ
          projects: new Set(), // Проекты
          timeEntries: [] // Все записи времени
        });
      }

      const employee = employeeMap.get(employeeName);
      employee.taskCount++;
      employee.recentTasks.push(task.title);
      employee.allTasks.push({
        title: task.title,
        description: task.description,
        date: task.date,
        hours: task.hours,
        status: task.status
      });
    });

    // Добавляем детальную информацию из трудозатрат
    rawData.timeEntries.forEach((entry: any) => {
      const employeeName = this.findEmployeeName(entry.employee_id, rawData.users);
      if (employeeMap.has(employeeName)) {
        const employee = employeeMap.get(employeeName);
        employee.totalHours += entry.hours;
        employee.timeEntries.push({
          date: entry.date,
          hours: entry.hours,
          description: entry.description,
          taskId: entry.task_id,
          projectId: entry.project_id,
          workType: entry.work_type
        });

        // Собираем уникальные типы работ
        if (entry.work_type) {
          employee.workTypes.add(entry.work_type);
        }
      }
    });

    // Добавляем информацию о проектах
    rawData.projects.forEach((project: any) => {
      // Находим сотрудников, работавших над проектом
      rawData.timeEntries.forEach((entry: any) => {
        if (entry.project_id === project.id) {
          const employeeName = this.findEmployeeName(entry.employee_id, rawData.users);
          if (employeeMap.has(employeeName)) {
            employeeMap.get(employeeName).projects.add(project.name);
          }
        }
      });
    });

    // Преобразуем Set в массивы для JSON
    const employees = Array.from(employeeMap.values()).map(emp => ({
      ...emp,
      workTypes: Array.from(emp.workTypes),
      projects: Array.from(emp.projects)
    }));

    return employees; // Возвращаем ВСЕХ сотрудников, не ограничиваем
  }

  private getRecentActivity(rawData: any, limit: number) {
    return rawData.timeEntries
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
      .map((entry: any) => ({
        date: entry.date,
        employee: this.findEmployeeName(entry.employee_id, rawData.users),
        task: this.findTaskName(entry.task_id, rawData.tasks),
        hours: entry.hours,
        description: entry.description
      }));
  }

  private getTopTasks(rawData: any, limit: number) {
    const taskHours = new Map();
    
    rawData.timeEntries.forEach((entry: any) => {
      const taskName = this.findTaskName(entry.task_id, rawData.tasks);
      if (!taskHours.has(taskName)) {
        taskHours.set(taskName, {
          title: taskName,
          employee: this.findEmployeeName(entry.employee_id, rawData.users),
          hours: 0,
          status: 'active'
        });
      }
      taskHours.get(taskName).hours += entry.hours;
    });

    return Array.from(taskHours.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, limit);
  }

  private findEmployeeName(employeeId: string, users: any[]): string {
    const user = users.find(u => u.id === employeeId);
    return user ? user.name : 'Неизвестный сотрудник';
  }

  private findTaskName(taskId: string, tasks: any[]): string {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : 'Неизвестная задача';
  }
}
