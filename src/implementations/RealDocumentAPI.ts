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

      // Пробуем оба варианта параметров из-за противоречия в документации
      let response: AxiosResponse;
      try {
        // Сначала пробуем 'users' как указано в описании
        response = await this.client.get('/users', {
          params: {
            users: params.names.join(',')
          }
        });
      } catch (error: any) {
        if (error.response?.status === 400) {
          console.log('🔄 Пробуем параметр userId вместо users');
          // Пробуем 'userId' как в примере документации
          response = await this.client.get('/users', {
            params: {
              userId: params.names.join(',')
            }
          });
        } else {
          throw error;
        }
      }

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
      return {
        success: false,
        data: [],
        message: `Ошибка API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async getAllUsers(): Promise<APIResponse<User[]>> {
    try {
      console.log('🔍 Real API: Получение всех пользователей через комбинацию /stufftime + /users');

      // Сначала получаем уникальные имена из /stufftime
      const stufftimeResponse = await this.client.get('/stufftime');

      if (stufftimeResponse.status !== 200 || !Array.isArray(stufftimeResponse.data)) {
        return {
          success: false,
          data: [],
          message: 'Не удалось получить данные трудозатрат'
        };
      }

      console.log(`🔍 Real API: Найдено записей stufftime: ${stufftimeResponse.data.length}`);

      // Извлекаем уникальные имена пользователей
      const uniqueNames = new Set<string>();
      stufftimeResponse.data.forEach((entry: any) => {
        if (entry.user && typeof entry.user === 'string') {
          uniqueNames.add(entry.user.trim());
        }
      });

      console.log(`🔍 Real API: Найдено уникальных имен: ${uniqueNames.size}`);

      // Теперь получаем правильные ID через /users для каждого имени
      const users: User[] = [];
      const nameArray = Array.from(uniqueNames);

      // Обрабатываем имена батчами для избежания перегрузки API
      for (const fullName of nameArray.slice(0, 10)) { // Ограничиваем первыми 10 для тестирования
        try {
          // Пробуем найти пользователя по полному имени
          const userResponse = await this.client.get('/users', {
            params: { users: fullName }
          });

          if (userResponse.status === 200 && userResponse.data && userResponse.data.length > 0) {
            const userData = userResponse.data[0];
            users.push({
              userName: userData.userName || fullName,
              userId: userData.userId
            });
            console.log(`✅ Найден пользователь: ${fullName} → ${userData.userId}`);
          } else {
            // Если не найден по полному имени, пробуем по фамилии
            const lastName = fullName.split(' ')[0];
            try {
              const lastNameResponse = await this.client.get('/users', {
                params: { users: lastName }
              });

              if (lastNameResponse.status === 200 && lastNameResponse.data && lastNameResponse.data.length > 0) {
                const userData = lastNameResponse.data[0];
                users.push({
                  userName: userData.userName || fullName,
                  userId: userData.userId
                });
                console.log(`✅ Найден пользователь по фамилии: ${lastName} → ${userData.userName} (${userData.userId})`);
              } else {
                console.log(`⚠️ Пользователь не найден в /users: ${fullName}`);
                // Добавляем с временным ID
                users.push({
                  userName: fullName,
                  userId: `temp_${users.length + 1}`
                });
              }
            } catch (lastNameError) {
              console.log(`❌ Ошибка поиска по фамилии ${lastName}:`, lastNameError);
              users.push({
                userName: fullName,
                userId: `temp_${users.length + 1}`
              });
            }
          }
        } catch (error) {
          console.log(`❌ Ошибка поиска пользователя ${fullName}:`, error);
          // Добавляем с временным ID
          users.push({
            userName: fullName,
            userId: `temp_${users.length + 1}`
          });
        }

        // Небольшая пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`✅ Real API: Обработано пользователей: ${users.length}`);
      console.log('🔍 Первые пользователи:', users.slice(0, 3));

      return {
        success: true,
        data: users,
        message: `Найдено пользователей: ${users.length}`
      };

    } catch (error: any) {
      console.error('❌ Real API Error (getAllUsers):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка получения пользователей: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async getEmployeeTasks(params: { employee_name?: string; userId?: string; limit?: number }): Promise<APIResponse<Task[]>> {
    try {
      const userId = params.userId;
      console.log(`📋 Real API: Получение задач для userId: ${userId}`);

      if (!userId) {
        console.log(`❌ Real API: userId не указан для получения задач`);
        return {
          success: false,
          data: [],
          message: 'userId обязателен для получения задач'
        };
      }

      const response: AxiosResponse = await this.client.get('/tasks', {
        params: {
          userId: userId,
          limit: params.limit || 50
        }
      });

      if (response.status === 200 && response.data) {
        const rawTasks = Array.isArray(response.data) ? response.data : [];

        console.log(`🔍 Real API: Структура первой задачи в getEmployeeTasks:`, rawTasks[0] ? JSON.stringify(rawTasks[0], null, 2) : 'Нет задач');
        console.log(`🔍 Real API: Всего задач: ${rawTasks.length}`);

        const tasks: Task[] = rawTasks.map((task: any) => ({
          id: task.id || task.taskId || task.guid,
          title: task.title || task.name || task.description,
          description: task.description || task.title || '',
          date: task.date || task.deadline || task.dueDate,
          status: task.status || 'active',
          hours: task.hours || task.plannedHours || 0
        }));

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
      const userId = params.userId;
      console.log(`⏱️ Real API: Получение трудозатрат для userId: ${userId}`);

      if (!userId) {
        console.log(`❌ Real API: userId не указан для получения трудозатрат`);
        return {
          success: false,
          data: [],
          message: 'userId обязателен для получения трудозатрат'
        };
      }

      // Конвертируем даты в формат API (YYYYMMDDHHMMSS)
      let fromParam, toParam;
      if (params.startDate) {
        fromParam = params.startDate.replace(/-/g, '') + '000000';
      }
      if (params.endDate) {
        toParam = params.endDate.replace(/-/g, '') + '235959';
      }

      console.log(`⏱️ Real API: Параметры запроса:`, {
        userId,
        from: fromParam,
        to: toParam,
        limit: params.limit || 100
      });

      const response: AxiosResponse = await this.client.get('/stufftime', {
        params: {
          userId: userId,
          from: fromParam,
          to: toParam,
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

      // Согласно документации, projectName обязательный параметр
      const projectName = params.name || 'АйТи План';

      const response: AxiosResponse = await this.client.get('/project', {
        params: {
          projectName: projectName
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
