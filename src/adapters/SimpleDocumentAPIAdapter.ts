import { getDocumentAPI } from "../container/DIContainer";
import { ApiResponse, Task, TimeEntry, Project, Employee } from "../types";
import { IDocumentAPI } from "../interfaces/IDocumentAPI";

export class SimpleDocumentAPIAdapter {
  private api: IDocumentAPI;

  constructor() {
    this.api = getDocumentAPI();
  }

  async getWorkTypes() {
    try {
      const response = await this.api.getWorkTypes();
      if (response.success) {
        return response.data;
      } else {
        console.error("Ошибка получения видов работ:", response.message);
        return [];
      }
    } catch (error) {
      console.error("Ошибка получения видов работ:", error);
      return [];
    }
  }

  async getAllEmployees(): Promise<ApiResponse<Employee[]>> {
    try {
      // Пробуем разные стратегии поиска пользователей
      let allUsers: any[] = [];

      // Стратегия 1: Поиск по популярным буквам русского алфавита
      const russianLetters = ["А", "Б", "В", "Г", "Д", "Е", "И", "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т"];

      for (const letter of russianLetters) {
        try {
          const response = await this.api.getUsersByNames({ names: [letter] });
          if (response.success && response.data.length > 0) {
            allUsers.push(...response.data);
            // Если нашли достаточно пользователей, прекращаем поиск
            if (allUsers.length >= 50) break;
          }
        } catch (error) {
          // Игнорируем ошибки отдельных запросов
          continue;
        }
      }

      // Стратегия 2: Если мало пользователей, пробуем английские буквы
      if (allUsers.length < 10) {
        const englishLetters = ["A", "B", "C", "D", "E", "I", "J", "K", "M", "P", "S", "T"];
        for (const letter of englishLetters) {
          try {
            const response = await this.api.getUsersByNames({ names: [letter] });
            if (response.success && response.data.length > 0) {
              allUsers.push(...response.data);
              if (allUsers.length >= 50) break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (allUsers.length > 0) {
        // Убираем дубликаты по userId
        const uniqueUsers = allUsers.filter((user, index, self) =>
          index === self.findIndex(u => u.userId === user.userId)
        );

        const employees: Employee[] = uniqueUsers.map(user => ({
          id: user.userId,
          name: user.userName,
          email: "",
          position: "Сотрудник",
          department: "Неизвестно"
        }));
        
        return {
          success: true,
          data: employees,
          message: `Найдено сотрудников: ${employees.length}`
        };
      } else {
        return {
          success: false,
          data: [],
          message: "Не удалось получить пользователей"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: `Ошибка получения сотрудников: ${error.message}`
      };
    }
  }

  async getEmployeeTasks(params: { employee_name?: string; limit?: number }): Promise<ApiResponse<Task[]>> {
    try {
      // Если указано имя сотрудника, сначала найдем его точный ID
      let employeeName = params.employee_name;

      if (employeeName) {
        // Ищем пользователя по частичному совпадению имени
        const userResponse = await this.findUserByName(employeeName);
        if (userResponse.success && userResponse.data.length > 0) {
          // Используем точное имя из API
          employeeName = userResponse.data[0].name;
        }
      }

      const response = await this.api.getEmployeeTasks({
        employee_name: employeeName,
        limit: params.limit
      });

      if (response.success) {
        const tasks: Task[] = response.data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          employee_id: "",
          project_id: "",
          hours: task.hours || 0,
          date: task.date,
          status: task.status as any || "pending"
        }));

        return {
          success: true,
          data: tasks,
          message: `Найдено задач: ${tasks.length}`
        };
      } else {
        return {
          success: false,
          data: [],
          message: response.message
        };
      }
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: `Ошибка получения задач: ${error.message}`
      };
    }
  }

  // Вспомогательный метод для поиска пользователя по имени
  private async findUserByName(searchName: string): Promise<ApiResponse<Employee[]>> {
    try {
      // Пробуем разные варианты поиска
      const searchVariants = [
        searchName, // Полное имя как есть
        searchName.charAt(0).toUpperCase() + searchName.slice(1).toLowerCase(), // Первая буква заглавная
        searchName.toUpperCase(), // Все заглавные
        searchName.toLowerCase(), // Все строчные
        searchName.split(' ')[0], // Только первое слово (имя)
        searchName.split(' ').pop() || searchName // Только последнее слово (фамилия)
      ];

      for (const variant of searchVariants) {
        try {
          const response = await this.api.getUsersByNames({ names: [variant] });
          if (response.success && response.data.length > 0) {
            // Фильтруем результаты по частичному совпадению
            const matchingUsers = response.data.filter(user =>
              user.userName.toLowerCase().includes(searchName.toLowerCase()) ||
              searchName.toLowerCase().includes(user.userName.toLowerCase())
            );

            if (matchingUsers.length > 0) {
              const employees: Employee[] = matchingUsers.map(user => ({
                id: user.userId,
                name: user.userName,
                email: "",
                position: "Сотрудник",
                department: "Неизвестно"
              }));

              return {
                success: true,
                data: employees,
                message: `Найдено пользователей: ${employees.length}`
              };
            }
          }
        } catch (error) {
          // Игнорируем ошибки отдельных вариантов поиска
          continue;
        }
      }

      return {
        success: false,
        data: [],
        message: `Пользователь "${searchName}" не найден`
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: `Ошибка поиска пользователя: ${error.message}`
      };
    }
  }

  async getTimeEntries(params: {
    employee_name?: string;
    start_date?: string;
    end_date?: string;
    limit?: number
  }): Promise<ApiResponse<TimeEntry[]>> {
    try {
      // Если указано имя сотрудника, найдем его точное имя
      let employeeName = params.employee_name;

      if (employeeName) {
        const userResponse = await this.findUserByName(employeeName);
        if (userResponse.success && userResponse.data.length > 0) {
          employeeName = userResponse.data[0].name;
        }
      }

      const response = await this.api.getTimeEntries({
        employee_name: employeeName,
        startDate: params.start_date,
        endDate: params.end_date,
        limit: params.limit
      });
      
      if (response.success) {
        const timeEntries: TimeEntry[] = response.data.map(entry => ({
          id: entry.id,
          employee_id: entry.userId,
          task_id: entry.taskId || "",
          project_id: entry.projectId || "",
          description: entry.description,
          hours: Math.round(entry.countOfMinutes / 60 * 100) / 100,
          date: entry.date,
          work_type: ""
        }));
        
        return {
          success: true,
          data: timeEntries,
          message: `Найдено записей времени: ${timeEntries.length}`
        };
      } else {
        return {
          success: false,
          data: [],
          message: response.message
        };
      }
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: `Ошибка получения трудозатрат: ${error.message}`
      };
    }
  }

  async getProjects(params: { name?: string; limit?: number }): Promise<ApiResponse<Project[]>> {
    try {
      const response = await this.api.getProjects({
        name: params.name,
        limit: params.limit
      });
      
      if (response.success) {
        const projects: Project[] = response.data.map(project => ({
          id: project.id,
          name: project.name,
          code: project.id,
          description: project.name,
          status: "active",
          start_date: "",
          end_date: ""
        }));
        
        return {
          success: true,
          data: projects,
          message: `Найдено проектов: ${projects.length}`
        };
      } else {
        return {
          success: false,
          data: [],
          message: response.message
        };
      }
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: `Ошибка получения проектов: ${error.message}`
      };
    }
  }

  async loadAllData(params: {
    start_date?: string;
    end_date?: string;
    employee_name?: string
  } = {}) {
    try {
      console.log('🔄 Загружаем релевантные данные из ДО...');

      // Устанавливаем разумные лимиты для LLM
      const TASK_LIMIT = 50;  // Максимум 50 задач
      const TIME_LIMIT = 100; // Максимум 100 записей времени

      // Устанавливаем временной диапазон по умолчанию (последние 30 дней)
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [workTypes, employees, tasks, timeEntries, projects] = await Promise.all([
        this.getWorkTypes(),
        this.getAllEmployees(),
        this.getEmployeeTasks({
          employee_name: params.employee_name,
          limit: TASK_LIMIT
        }),
        this.getTimeEntries({
          employee_name: params.employee_name,
          start_date: params.start_date || defaultStartDate,
          end_date: params.end_date || defaultEndDate,
          limit: TIME_LIMIT
        }),
        this.getProjects({ limit: 20 })
      ]);

      const result = {
        workTypes,
        users: employees.success ? employees.data : [],
        tasks: tasks.success ? tasks.data : [],
        timeEntries: timeEntries.success ? timeEntries.data : [],
        projects: projects.success ? projects.data : []
      };

      console.log('📊 Данные загружены:', {
        users: result.users.length,
        projects: result.projects.length,
        tasks: result.tasks.length,
        timeEntries: result.timeEntries.length
      });

      return result;
    } catch (error: any) {
      console.error('❌ Ошибка загрузки данных:', error.message);
      throw error;
    }
  }
}
