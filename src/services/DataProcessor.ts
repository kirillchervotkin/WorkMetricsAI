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
    
    // Анализируем запрос
    const queryContext = this.analyzeQuery(userQuery);
    console.log('📊 Контекст запроса:', queryContext);

    // Загружаем только релевантные данные
    const rawData = await this.loadRelevantData(queryContext);
    
    // Обрабатываем и агрегируем данные
    const processedData = this.aggregateData(rawData, queryContext);
    
    console.log('✅ Данные обработаны для LLM:', {
      employees: processedData.employees.length,
      recentActivity: processedData.recentActivity.length,
      topTasks: processedData.topTasks.length
    });

    return processedData;
  }

  private analyzeQuery(query: string) {
    const queryLower = query.toLowerCase();
    
    return {
      employeeName: this.extractEmployeeName(queryLower),
      timeframe: this.extractTimeframe(queryLower),
      queryType: this.detectQueryType(queryLower),
      needsDetailed: queryLower.includes('подробно') || queryLower.includes('детально'),
      needsStats: queryLower.includes('статистика') || queryLower.includes('сколько') || queryLower.includes('количество')
    };
  }

  private extractEmployeeName(query: string): string | undefined {
    // Ищем любые имена в запросе (русские и английские)
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
        // Возвращаем первое найденное имя
        return matches[0].trim();
      }
    }
    return undefined;
  }

  private extractTimeframe(query: string) {
    const today = new Date();
    
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
    
    // По умолчанию - последние 7 дней
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      start: weekAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      label: 'за последние 7 дней'
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
    // Устанавливаем разумные лимиты
    const limits = {
      tasks: context.needsDetailed ? 100 : 50,
      timeEntries: context.needsDetailed ? 200 : 100,
      projects: 20
    };

    console.log('📥 Загружаем данные с лимитами:', limits);

    return await this.adapter.loadAllData({
      employee_name: context.employeeName,
      start_date: context.timeframe.start,
      end_date: context.timeframe.end,
      ...limits
    });
  }

  private aggregateData(rawData: any, context: any): ProcessedData {
    // Группируем данные по сотрудникам
    const employeeStats = this.groupByEmployee(rawData);
    
    // Получаем последнюю активность
    const recentActivity = this.getRecentActivity(rawData, 20);
    
    // Топ задач по времени
    const topTasks = this.getTopTasks(rawData, 15);

    return {
      summary: {
        totalUsers: rawData.users.length,
        totalTasks: rawData.tasks.length,
        totalTimeEntries: rawData.timeEntries.length,
        totalProjects: rawData.projects.length,
        dateRange: context.timeframe.label
      },
      employees: employeeStats,
      recentActivity,
      topTasks
    };
  }

  private groupByEmployee(rawData: any) {
    const employeeMap = new Map();

    // Группируем задачи по сотрудникам
    rawData.tasks.forEach((task: any) => {
      const employeeName = this.findEmployeeName(task.employee_id, rawData.users);
      if (!employeeMap.has(employeeName)) {
        employeeMap.set(employeeName, {
          name: employeeName,
          id: task.employee_id,
          taskCount: 0,
          totalHours: 0,
          recentTasks: []
        });
      }
      
      const employee = employeeMap.get(employeeName);
      employee.taskCount++;
      employee.recentTasks.push(task.title);
    });

    // Добавляем время из трудозатрат
    rawData.timeEntries.forEach((entry: any) => {
      const employeeName = this.findEmployeeName(entry.employee_id, rawData.users);
      if (employeeMap.has(employeeName)) {
        employeeMap.get(employeeName).totalHours += entry.hours;
      }
    });

    return Array.from(employeeMap.values()).slice(0, 10); // Топ 10 сотрудников
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
