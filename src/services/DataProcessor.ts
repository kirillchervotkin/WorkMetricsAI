import { SimpleDocumentAPIAdapter } from "../adapters/SimpleDocumentAPIAdapter";

export interface ProcessedData {
  summary: {
    totalUsers: number;
    totalTasks: number;
    totalTimeEntries: number;
    totalProjects: number;
    dateRange: string;
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

  constructor() {
    this.adapter = new SimpleDocumentAPIAdapter();
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
    console.log('🔍 Анализируем запрос:', queryLower);

    // Определяем основной тип запроса
    const queryIntent = this.detectQueryIntent(queryLower);

    const context = {
      employeeName: this.extractEmployeeName(queryLower, employees),
      timeframe: this.extractTimeframe(queryLower),
      queryType: this.detectQueryType(queryLower),
      queryIntent: queryIntent,
      needsDetailed: queryLower.includes('подробно') || queryLower.includes('детально'),
      needsStats: queryLower.includes('статистика') || queryLower.includes('сколько') || queryLower.includes('количество'),
      needsTasks: this.needsTasks(queryLower, queryIntent),
      needsTimeEntries: this.needsTimeEntries(queryLower, queryIntent),
      needsProjects: this.needsProjects(queryLower, queryIntent),
      needsOverdue: this.needsOverdue(queryLower, queryIntent),
      needsUserList: this.needsUserList(queryLower, queryIntent),
      employees: employees,
      isSpecificQuery: this.isSpecificQuery(queryLower)
    };

    console.log('📋 Определены потребности в данных:', {
      intent: context.queryIntent,
      userList: context.needsUserList,
      tasks: context.needsTasks,
      timeEntries: context.needsTimeEntries,
      projects: context.needsProjects,
      overdue: context.needsOverdue,
      specific: context.isSpecificQuery
    });

    return context;
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
    if (query.includes('просрочен') || query.includes('просрочка')) return 'overdue';
    return 'general';
  }

  private detectQueryIntent(query: string): string {
    // Определяем основное намерение запроса
    if (query.includes('список пользователей') || query.includes('все пользователи') ||
        (query.includes('пользователи') && !query.includes('что делал'))) return 'user_list';

    if (query.includes('список задач') || query.includes('все задачи') ||
        (query.includes('задачи') && !query.includes('что делал'))) return 'task_list';

    if (query.includes('конкретная задача') || query.includes('задача ') ||
        query.includes('найди задачу')) return 'specific_task';

    if (query.includes('трудозатраты') || query.includes('время') ||
        query.includes('часов') || query.includes('отработал')) return 'time_entries';

    if (query.includes('просрочен') || query.includes('просрочка') ||
        query.includes('дедлайн')) return 'overdue_check';

    if (query.includes('проекты') || query.includes('список проектов')) return 'project_list';

    if (query.includes('что делал') || query.includes('активность') ||
        query.includes('работал над')) return 'user_activity';

    return 'general_info';
  }

  private isSpecificQuery(query: string): boolean {
    // Определяем, является ли запрос специфичным (требует только конкретную информацию)
    const specificPatterns = [
      'список пользователей', 'все пользователи', 'пользователи',
      'список задач', 'все задачи', 'задачи',
      'список проектов', 'все проекты', 'проекты',
      'трудозатраты', 'время', 'часов',
      'просрочен', 'просрочка'
    ];

    return specificPatterns.some(pattern => query.includes(pattern));
  }

  private needsUserList(query: string, intent: string): boolean {
    return intent === 'user_list' ||
           query.includes('список пользователей') ||
           query.includes('все пользователи') ||
           (query.includes('пользователи') && !query.includes('что делал'));
  }

  private needsTasks(query: string, intent: string): boolean {
    return intent === 'task_list' || intent === 'specific_task' || intent === 'user_activity' ||
           query.includes('задач') || query.includes('задачи') ||
           query.includes('что делал') || query.includes('работал над') ||
           query.includes('выполнил') || query.includes('сделал');
  }

  private needsTimeEntries(query: string, intent: string): boolean {
    return intent === 'time_entries' || intent === 'user_activity' ||
           query.includes('время') || query.includes('часов') ||
           query.includes('трудозатрат') || query.includes('сколько работал') ||
           query.includes('отработал') || query.includes('потратил');
  }

  private needsProjects(query: string, intent: string): boolean {
    return intent === 'project_list' ||
           query.includes('проект') || query.includes('проекты') ||
           query.includes('проектах') || query.includes('по проекту');
  }

  private needsOverdue(query: string, intent: string): boolean {
    return intent === 'overdue_check' ||
           query.includes('просрочен') || query.includes('просрочка') ||
           query.includes('дедлайн') || query.includes('опоздал') ||
           query.includes('не успел') || query.includes('задержка');
  }

  private async loadRelevantData(context: any) {
    console.log('📥 Начинаем оптимизированную загрузку данных...');
    console.log('🎯 Намерение запроса:', context.queryIntent);

    const result: any = {
      users: context.employees,
      workTypes: [],
      tasks: [],
      timeEntries: [],
      projects: [],
      overdueInfo: null
    };

    // Загружаем только то, что действительно нужно для ответа
    switch (context.queryIntent) {
      case 'user_list':
        console.log('👥 Запрос списка пользователей - данные уже загружены');
        break;

      case 'task_list':
        console.log('📋 Загружаем список задач...');
        await this.loadTasks(result, context);
        break;

      case 'specific_task':
        console.log('🔍 Поиск конкретной задачи...');
        await this.loadTasks(result, context);
        break;

      case 'time_entries':
        console.log('⏰ Загружаем трудозатраты...');
        await this.loadTimeEntries(result, context);
        break;

      case 'overdue_check':
        console.log('⚠️ Проверяем просроченные задачи...');
        await this.loadOverdueInfo(result, context);
        break;

      case 'project_list':
        console.log('🏗️ Загружаем список проектов...');
        await this.loadProjects(result, context);
        break;

      case 'user_activity':
        console.log('👤 Загружаем активность пользователя...');
        await this.loadUserActivity(result, context);
        break;

      default:
        console.log('📊 Загружаем общую информацию...');
        await this.loadGeneralInfo(result, context);
        break;
    }

    console.log('📊 Итоговая статистика загруженных данных:', {
      users: result.users.length,
      workTypes: result.workTypes.length,
      tasks: result.tasks.length,
      timeEntries: result.timeEntries.length,
      projects: result.projects.length,
      hasOverdueInfo: !!result.overdueInfo
    });

    return result;
  }

  // Методы для загрузки конкретных типов данных
  private async loadTasks(result: any, context: any) {
    try {
      const tasksResponse = await this.adapter.getEmployeeTasks({
        employee_name: context.employeeName,
        limit: context.employeeName ? 100 : 50
      });
      result.tasks = tasksResponse.success ? tasksResponse.data : [];
      console.log(`✅ Загружено задач: ${result.tasks.length}`);
    } catch (error) {
      console.log('⚠️ Ошибка загрузки задач:', error);
    }
  }

  private async loadTimeEntries(result: any, context: any) {
    try {
      const timeResponse = await this.adapter.getTimeEntries({
        employee_name: context.employeeName,
        start_date: context.timeframe.start,
        end_date: context.timeframe.end,
        limit: 200
      });
      result.timeEntries = timeResponse.success ? timeResponse.data : [];
      console.log(`✅ Загружено записей времени: ${result.timeEntries.length}`);
    } catch (error) {
      console.log('⚠️ Ошибка загрузки записей времени:', error);
    }
  }

  private async loadProjects(result: any, context: any) {
    try {
      const projectsResponse = await this.adapter.getProjects({ limit: 30 });
      result.projects = projectsResponse.success ? projectsResponse.data : [];
      console.log(`✅ Загружено проектов: ${result.projects.length}`);
    } catch (error) {
      console.log('⚠️ Ошибка загрузки проектов:', error);
    }
  }

  private async loadOverdueInfo(result: any, context: any) {
    if (context.employeeName) {
      try {
        const employee = context.employees.find((emp: any) =>
          emp.name.toLowerCase().includes(context.employeeName.toLowerCase())
        );

        if (employee && employee.id) {
          result.overdueInfo = await this.checkOverdueTasks(employee.id);
          console.log(`✅ Проверка просрочки завершена:`, result.overdueInfo);
        }
      } catch (error) {
        console.log('⚠️ Ошибка проверки просрочки:', error);
      }
    }
  }

  private async loadUserActivity(result: any, context: any) {
    // Загружаем задачи и время для анализа активности
    await this.loadTasks(result, context);
    await this.loadTimeEntries(result, context);
  }

  private async loadGeneralInfo(result: any, context: any) {
    // Загружаем минимальный набор данных для общих запросов
    try {
      result.workTypes = await this.adapter.getWorkTypes();
      console.log(`✅ Загружено типов работ: ${result.workTypes.length}`);
    } catch (error) {
      console.log('⚠️ Ошибка загрузки типов работ:', error);
    }
  }

  private async checkOverdueTasks(userId: string) {
    console.log(`⚠️ Проверяем просроченные задачи для пользователя: ${userId}`);

    try {
      // Пытаемся использовать legacy API для проверки просрочки
      const api = this.adapter as any;

      if (api.api && typeof api.api.checkOverdueTasks === 'function') {
        const result = await api.api.checkOverdueTasks(userId);
        return {
          hasOverdue: result.result || false,
          details: result.result ? 'Найдены просроченные задачи' : 'Просроченных задач нет'
        };
      } else {
        // Fallback: анализируем задачи на просрочку
        console.log('📋 Legacy API недоступен, анализируем задачи на просрочку...');
        const employee = this.findEmployeeName(userId, []);
        const tasksResponse = await this.adapter.getEmployeeTasks({
          employee_name: employee || undefined,
          limit: 100
        });

        if (tasksResponse.success) {
          const today = new Date();
          const overdueTasks = tasksResponse.data.filter((task: any) => {
            if (task.date && task.status !== 'completed') {
              const taskDate = new Date(task.date);
              return taskDate < today;
            }
            return false;
          });

          return {
            hasOverdue: overdueTasks.length > 0,
            details: overdueTasks.length > 0
              ? `Найдено ${overdueTasks.length} просроченных задач`
              : 'Просроченных задач нет'
          };
        }
      }

      return {
        hasOverdue: false,
        details: 'Не удалось проверить просрочку'
      };
    } catch (error) {
      console.log('❌ Ошибка проверки просрочки:', error);
      return {
        hasOverdue: false,
        details: 'Ошибка при проверке просрочки'
      };
    }
  }

  private aggregateData(rawData: any, context: any): ProcessedData {
    console.log('🔄 Фильтруем данные по запрашиваемому периоду:', context.timeframe);

    // Фильтруем данные по запрашиваемому временному периоду
    const filteredData = this.filterDataByTimeframe(rawData, context.timeframe);

    console.log('📊 Данные после фильтрации:', {
      allTasks: rawData.tasks.length,
      filteredTasks: filteredData.tasks.length,
      allTimeEntries: rawData.timeEntries.length,
      filteredTimeEntries: filteredData.timeEntries.length
    });

    // Группируем отфильтрованные данные по сотрудникам
    const employeeStats = this.groupByEmployee(filteredData);

    // Получаем активность за запрашиваемый период
    const recentActivity = this.getRecentActivity(filteredData, 100);

    // Задачи за запрашиваемый период
    const topTasks = this.getTopTasks(filteredData, 50);

    return {
      summary: {
        totalUsers: rawData.users.length, // Общее количество пользователей
        totalTasks: filteredData.tasks.length, // Задачи за период
        totalTimeEntries: filteredData.timeEntries.length, // Записи времени за период
        totalProjects: filteredData.projects.length, // Проекты за период
        dateRange: context.timeframe.label
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
