import { getLegacyDocumentAPI } from "../container/DIContainer";
import { ApiResponse, Task, TimeEntry, Project, Employee } from "../types";
import { ILegacyDocumentAPI, ITask, IUserStuffTime } from "../interfaces/IDocumentAPI";

/**
 * Адаптер для преобразования данных между новым IoC API и старым интерфейсом
 */
export class DocumentAPIAdapter {
  private api: ILegacyDocumentAPI;

  constructor() {
    this.api = getLegacyDocumentAPI();
  }

  // Вспомогательная функция для форматирования даты из API
  private formatDateFromAPI(apiDate: string): string {
    if (!apiDate || apiDate.length < 8) return new Date().toISOString().split('T')[0];
    
    // Формат API: "YYYYMMDDHHMMSS"
    const year = apiDate.substring(0, 4);
    const month = apiDate.substring(4, 6);
    const day = apiDate.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  }

  // Вспомогательная функция для форматирования даты в API формат
  private formatDateToAPI(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}000000`; // Добавляем время 00:00:00
  }

  // Получение задач сотрудника
  async getEmployeeTasks(params: {
    employee_name?: string;
    project?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<ApiResponse<Task[]>> {
    try {
      let userId: string | undefined;
      
      // Если указано имя сотрудника, получаем его ID
      if (params.employee_name) {
        const users = await this.api.getUsersByNames(params.employee_name);
        if (users.length === 0) {
          return {
            success: false,
            data: [],
            message: `Пользователь "${params.employee_name}" не найден`
          };
        }
        userId = users[0].userId;
      }

      // Получаем задачи пользователя
      let tasks: ITask[] = [];
      if (userId) {
        tasks = await this.api.getTasksByUserId(userId);
      } else {
        // Если пользователь не указан, возвращаем пустой список
        tasks = [];
      }

      // Преобразуем формат данных API в наш формат
      const adaptedTasks: Task[] = tasks.map((task: ITask) => ({
        id: task.id,
        title: task.name,
        description: task.name,
        employee_id: userId || "",
        project_id: "",
        hours: 0, // API не возвращает часы в списке задач
        date: this.formatDateFromAPI(task.deadline),
        status: "pending" as const
      }));

      return {
        success: true,
        data: adaptedTasks.slice(0, params.limit || 50),
        total: adaptedTasks.length
      };
    } catch (error) {
      console.error("Ошибка получения задач:", error);
      return {
        success: false,
        data: [],
        message: "Не удалось получить данные о задачах"
      };
    }
  }

  // Получение проектов
  async getProjects(activeOnly: boolean = true): Promise<ApiResponse<Project[]>> {
    try {
      // API не предоставляет метод для получения всех проектов
      // Возвращаем заглушку с информацией
      return {
        success: true,
        data: [],
        message: "Для получения проектов используйте поиск по названию через команды бота"
      };
    } catch (error) {
      console.error("Ошибка получения проектов:", error);
      return {
        success: false,
        data: [],
        message: "Не удалось получить список проектов"
      };
    }
  }

  // Получение сотрудников
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    try {
      // API требует параметр для поиска, поэтому возвращаем заглушку
      return {
        success: true,
        data: [],
        message: "Для получения пользователей используйте поиск по имени"
      };
    } catch (error) {
      console.error("Ошибка получения сотрудников:", error);
      return {
        success: false,
        data: [],
        message: "Не удалось получить список сотрудников"
      };
    }
  }

  // Получение отчета по трудозатратам
  async getTimeReport(params: {
    employee_name?: string;
    project_id?: string;
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<TimeEntry[]>> {
    try {
      let userIds: string[] = [];
      
      // Если указано имя сотрудника, получаем его ID
      if (params.employee_name) {
        const users = await this.api.getUsersByNames(params.employee_name);
        if (users.length > 0) {
          userIds = users.map(u => u.userId);
        }
      }

      // Формируем параметры для API
      const apiParams = {
        userId: userIds.length > 0 ? userIds.join(',') : undefined,
        projectId: params.project_id,
        from: this.formatDateToAPI(params.start_date),
        to: this.formatDateToAPI(params.end_date)
      };

      const stuffTimeData = await this.api.getStuffTime(apiParams);

      // Преобразуем формат данных API в наш формат
      const timeEntries: TimeEntry[] = [];
      
      stuffTimeData.forEach((userEntry: IUserStuffTime) => {
        userEntry.stufftime.forEach((entry, index) => {
          timeEntries.push({
            id: `${userEntry.user}-${index}-${Date.now()}`,
            task_id: "",
            employee_id: userEntry.user,
            employee_name: userEntry.user,
            project_id: params.project_id || "",
            hours: Math.round(entry.countOfMinutes / 60 * 100) / 100, // Конвертируем минуты в часы
            date: params.start_date,
            description: entry.description
          });
        });
      });

      return {
        success: true,
        data: timeEntries,
        total: timeEntries.length
      };
    } catch (error) {
      console.error("Ошибка получения отчета:", error);
      return {
        success: false,
        data: [],
        message: "Не удалось получить отчет по трудозатратам"
      };
    }
  }

  // Поиск проекта по названию
  async findProjectByName(projectName: string): Promise<Project | null> {
    try {
      const project = await this.api.getProjectByName(projectName);
      if (!project) return null;

      return {
        id: project.id,
        name: project.name,
        code: project.id, // Используем ID как код
        status: "active" as const,
        start_date: new Date().toISOString().split('T')[0],
        end_date: undefined
      };
    } catch (error) {
      console.error("Ошибка поиска проекта:", error);
      return null;
    }
  }

  // Получение видов работ
  async getWorkTypes() {
    try {
      return await this.api.getWorkTypes();
    } catch (error) {
      console.error("Ошибка получения видов работ:", error);
      return [];
    }
  }
}
