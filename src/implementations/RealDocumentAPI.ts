import axios, { AxiosInstance, AxiosResponse } from "axios";
import https from "https";
import { config } from "../config";
import {
  IDocumentAPI,
  User,
  Task,
  TimeEntry,
  Project,
  WorkType,
  APIResponse
} from "../interfaces/IDocumentAPI";

export class RealDocumentAPI implements IDocumentAPI {
  private client: AxiosInstance;

  constructor() {
    const username = config.DO_API_USERNAME;
    const password = config.DO_API_PASSWORD;

    // Создаем Basic Auth с правильной кодировкой UTF-8
    const credentials = `${username}:${password}`;
    const basicAuth = Buffer.from(credentials, 'utf8').toString('base64');

    // Альтернативный способ для проблемных символов
    const alternativeAuth = Buffer.from(encodeURIComponent(credentials), 'utf8').toString('base64');

    console.log('🔐 Auth Debug:');
    console.log('Username:', username);
    console.log('Password length:', password.length);
    console.log('Credentials string length:', credentials.length);
    console.log('Basic Auth (Buffer):', basicAuth);
    console.log('Basic Auth (Alternative):', alternativeAuth);
    console.log('Expected from docs:', 'ZXhjaGFuZ2VfYXBpX3VzZXI6ZUBDTXc5JVEkb3FHVmRzRXt3');
    console.log('Match with expected:', basicAuth === 'ZXhjaGFuZ2VfYXBpX3VzZXI6ZUBDTXc5JVEkb3FHVmRzRXt3');

    this.client = axios.create({
      baseURL: config.DO_API_URL,
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "WorkMetricsAI-Bot/1.0"
      },
      timeout: 15000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    console.log('🌐 Real DocumentAPI initialized with Basic Auth');
  }

  async getUsersByNames(params: { names: string[] }): Promise<APIResponse<User[]>> {
    try {
      console.log(`🔍 Real API: Поиск пользователей по именам ${params.names.join(', ')}`);

      // Согласно документации API, параметр должен называться 'users', а не 'names'
      const requestParams = {
        users: params.names.join(',') // Используем 'users' как в документации
      };

      console.log(`📋 Параметры запроса:`, requestParams);
      console.log(`🌐 Полный URL: ${this.client.defaults.baseURL}/users?users=${encodeURIComponent(requestParams.users)}`);

      const response: AxiosResponse = await this.client.get('/users', {
        params: requestParams
      });

      if (response.status === 200 && response.data) {
        const users: User[] = Array.isArray(response.data) ? response.data.map((user: any) => ({
          userName: user.userName || user.name || user.fullName,
          userId: user.userId || user.id || user.guid
        })) : [];

        console.log(`✅ Real API: Найдено пользователей: ${users.length}`);
        return {
          success: true,
          data: users,
          message: `Найдено пользователей: ${users.length}`
        };
      }

      return {
        success: false,
        data: [],
        message: 'Пользователи не найдены'
      };

    } catch (error: any) {
      console.error('❌ Real API Error (getUsersByNames):', error.message);

      if (error.response) {
        console.log(`📊 Response Status: ${error.response.status}`);
        console.log(`📊 Response Data:`, error.response.data);
        console.log(`📊 Response Headers:`, error.response.headers);

        if (error.response.status === 400) {
          console.log(`⚠️ 400 Bad Request - возможно неправильные параметры запроса`);
          console.log(`🔍 Проверьте параметр 'users' в документации API`);
        }
      }

      if (error.request) {
        console.log(`📊 Request Config:`, {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          headers: error.config?.headers
        });
      }

      return {
        success: false,
        data: [],
        message: `Ошибка API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async getEmployeeTasks(params: { employee_name?: string; userId?: string; limit?: number }): Promise<APIResponse<Task[]>> {
    try {
      console.log(`📋 Real API: Получение задач для ${params.employee_name || params.userId}`);

      // Сначала получаем userId если передано имя
      let userId = params.userId;
      if (!userId && params.employee_name) {
        const usersResult = await this.getUsersByNames({ names: [params.employee_name] });
        if (usersResult.success && usersResult.data.length > 0) {
          userId = usersResult.data[0].userId;
        } else {
          return {
            success: false,
            data: [],
            message: 'Пользователь не найден'
          };
        }
      }

      const response: AxiosResponse = await this.client.get('/tasks', {
        params: {
          userId: userId,
          limit: params.limit || 50
        }
      });

      if (response.status === 200 && response.data) {
        const tasks: Task[] = Array.isArray(response.data) ? response.data.map((task: any) => ({
          id: task.id || task.taskId || task.guid,
          title: task.title || task.name || task.description,
          description: task.description || task.title || '',
          date: task.date || task.deadline || task.dueDate,
          status: task.status || 'active',
          hours: task.hours || task.plannedHours || 0
        })) : [];

        console.log(`✅ Real API: Найдено задач: ${tasks.length}`);
        return {
          success: true,
          data: tasks,
          message: `Найдено задач: ${tasks.length}`
        };
      }

      return {
        success: false,
        data: [],
        message: 'Задачи не найдены'
      };

    } catch (error: any) {
      console.error('❌ Real API Error (getEmployeeTasks):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async getTimeEntries(params: {
    employee_name?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number
  }): Promise<APIResponse<TimeEntry[]>> {
    try {
      console.log(`⏱️ Real API: Получение трудозатрат для ${params.employee_name || params.userId}`);

      // Получаем userId если передано имя
      let userId = params.userId;
      if (!userId && params.employee_name) {
        const usersResult = await this.getUsersByNames({ names: [params.employee_name] });
        if (usersResult.success && usersResult.data.length > 0) {
          userId = usersResult.data[0].userId;
        } else {
          return {
            success: false,
            data: [],
            message: 'Пользователь не найден'
          };
        }
      }

      const response: AxiosResponse = await this.client.get('/stufftime', {
        params: {
          userId: userId,
          startDate: params.startDate,
          endDate: params.endDate,
          limit: params.limit || 100
        }
      });

      if (response.status === 200 && response.data) {
        const timeEntries: TimeEntry[] = Array.isArray(response.data) ? response.data.map((entry: any) => ({
          id: entry.id || entry.guid,
          userId: entry.userId || userId,
          description: entry.description || entry.comment || entry.workDescription,
          countOfMinutes: entry.countOfMinutes || entry.minutes || (entry.hours ? entry.hours * 60 : 0),
          date: entry.date || entry.workDate || entry.created,
          taskId: entry.taskId || entry.task?.id,
          projectId: entry.projectId || entry.project?.id,
          workTypeId: entry.workTypeId || entry.workType?.id
        })) : [];

        console.log(`✅ Real API: Найдено записей времени: ${timeEntries.length}`);
        return {
          success: true,
          data: timeEntries,
          message: `Найдено записей времени: ${timeEntries.length}`
        };
      }

      return {
        success: false,
        data: [],
        message: 'Записи времени не найдены'
      };

    } catch (error: any) {
      console.error('❌ Real API Error (getTimeEntries):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async getProjects(params: { name?: string; limit?: number }): Promise<APIResponse<Project[]>> {
    try {
      console.log(`🏗️ Real API: Получение проектов ${params.name ? `по имени: ${params.name}` : ''}`);

      const response: AxiosResponse = await this.client.get('/project', {
        params: {
          name: params.name,
          limit: params.limit || 50
        }
      });

      if (response.status === 200 && response.data) {
        const projects: Project[] = Array.isArray(response.data) ? response.data.map((project: any) => ({
          id: project.id || project.projectId || project.guid,
          name: project.name || project.title || project.projectName
        })) : [];

        console.log(`✅ Real API: Найдено проектов: ${projects.length}`);
        return {
          success: true,
          data: projects,
          message: `Найдено проектов: ${projects.length}`
        };
      }

      return {
        success: false,
        data: [],
        message: 'Проекты не найдены'
      };

    } catch (error: any) {
      console.error('❌ Real API Error (getProjects):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async getWorkTypes(): Promise<APIResponse<WorkType[]>> {
    try {
      console.log('🔧 Real API: Получение типов работ');

      const response: AxiosResponse = await this.client.get('/worktypes');

      if (response.status === 200 && response.data) {
        const workTypes: WorkType[] = Array.isArray(response.data) ? response.data.map((workType: any) => ({
          id: workType.id || workType.workTypeId || workType.guid,
          name: workType.name || workType.title || workType.workTypeName
        })) : [];

        console.log(`✅ Real API: Найдено типов работ: ${workTypes.length}`);
        return {
          success: true,
          data: workTypes,
          message: `Найдено типов работ: ${workTypes.length}`
        };
      }

      return {
        success: false,
        data: [],
        message: 'Типы работ не найдены'
      };

    } catch (error: any) {
      console.error('❌ Real API Error (getWorkTypes):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  // Метод для тестирования подключения
  async testConnection(): Promise<APIResponse<any>> {
    try {
      console.log('🔌 Real API: Тестирование подключения...');

      // Пробуем получить список типов работ как простой тест
      const response = await this.client.get('/worktypes');

      return {
        success: true,
        data: { status: 'connected', statusCode: response.status },
        message: 'Подключение к Real API успешно!'
      };

    } catch (error: any) {
      console.error('❌ Real API Connection Test Failed:', error.message);
      return {
        success: false,
        data: null,
        message: `Ошибка подключения: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}
