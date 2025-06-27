import {
  IDocumentAPI,
  User,
  Task,
  TimeEntry,
  Project,
  WorkType,
  APIResponse
} from '../interfaces/IDocumentAPI';
import { MockDocumentAPI } from './MockDocumentAPI';

export class MockDocumentAPINew implements IDocumentAPI {
  private mockAPI: MockDocumentAPI;

  constructor() {
    this.mockAPI = new MockDocumentAPI();
    console.log('🎭 Mock DocumentAPI (New Interface) initialized');
  }

  async getUsersByNames(params: { names: string[] }): Promise<APIResponse<User[]>> {
    try {
      console.log(`🔍 Mock: Поиск пользователей по именам ${params.names.join(', ')}`);
      
      const foundUsers: User[] = [];
      
      for (const name of params.names) {
        const legacyUsers = await this.mockAPI.getUsersByNames(name);

        for (const user of legacyUsers) {
          foundUsers.push({
            userName: user.userName,
            userId: user.userId
          });
        }
      }
      
      console.log(`✅ Mock: Найдено пользователей: ${foundUsers.length}`);
      return {
        success: true,
        data: foundUsers,
        message: `Найдено пользователей: ${foundUsers.length}`
      };
      
    } catch (error: any) {
      console.error('❌ Mock API Error (getUsersByNames):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка Mock API: ${error.message}`
      };
    }
  }

  async getEmployeeTasks(params: { employee_name?: string; userId?: string; limit?: number }): Promise<APIResponse<Task[]>> {
    try {
      console.log(`📋 Mock: Получение задач для ${params.employee_name || params.userId}`);

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

      const legacyTasks = await this.mockAPI.getTasksByUserId(userId || '');

      const tasks: Task[] = legacyTasks.map(task => ({
        id: task.id,
        title: task.name,
        description: task.name,
        date: this.formatDateFromAPI(task.deadline),
        status: 'active',
        hours: 8
      }));

      const limitedTasks = params.limit ? tasks.slice(0, params.limit) : tasks;
      
      console.log(`✅ Mock: Найдено задач: ${limitedTasks.length}`);
      return {
        success: true,
        data: limitedTasks,
        message: `Найдено задач: ${limitedTasks.length}`
      };
      
    } catch (error: any) {
      console.error('❌ Mock API Error (getEmployeeTasks):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка Mock API: ${error.message}`
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
      console.log(`⏱️ Mock: Получение трудозатрат для ${params.employee_name || params.userId}`);
      
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

      // Получаем данные через старый метод
      const legacyData = await this.mockAPI.getStuffTime({ userId });
      
      // Преобразуем в новый формат
      const timeEntries: TimeEntry[] = [];
      let entryId = 1;
      
      for (const userData of legacyData) {
        for (const entry of userData.stufftime) {
          timeEntries.push({
            id: `entry_${entryId++}`,
            userId: userId || '',
            description: entry.description,
            countOfMinutes: entry.countOfMinutes,
            date: new Date().toISOString().split('T')[0], // Текущая дата
            taskId: `task_${entryId}`,
            projectId: `project_${entryId}`,
            workTypeId: `worktype_${entryId}`
          });
        }
      }

      const limitedEntries = params.limit ? timeEntries.slice(0, params.limit) : timeEntries;
      
      console.log(`✅ Mock: Найдено записей времени: ${limitedEntries.length}`);
      return {
        success: true,
        data: limitedEntries,
        message: `Найдено записей времени: ${limitedEntries.length}`
      };
      
    } catch (error: any) {
      console.error('❌ Mock API Error (getTimeEntries):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка Mock API: ${error.message}`
      };
    }
  }

  async getProjects(params: { name?: string; limit?: number }): Promise<APIResponse<Project[]>> {
    try {
      console.log(`🏗️ Mock: Получение проектов ${params.name ? `по имени: ${params.name}` : ''}`);
      
      // Получаем проекты через старый метод
      let project = null;
      if (params.name) {
        project = await this.mockAPI.getProjectByName(params.name);
      }

      let projects: Project[] = [];
      if (project) {
        projects = [{
          id: project.id,
          name: project.name
        }];
      } else {
        // Возвращаем все проекты из mock данных
        const mockProjects = (this.mockAPI as any).projects || [];
        projects = mockProjects.map((p: any) => ({
          id: p.id,
          name: p.name
        }));
      }

      const limitedProjects = params.limit ? projects.slice(0, params.limit) : projects;
      
      console.log(`✅ Mock: Найдено проектов: ${limitedProjects.length}`);
      return {
        success: true,
        data: limitedProjects,
        message: `Найдено проектов: ${limitedProjects.length}`
      };
      
    } catch (error: any) {
      console.error('❌ Mock API Error (getProjects):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка Mock API: ${error.message}`
      };
    }
  }

  async getWorkTypes(): Promise<APIResponse<WorkType[]>> {
    try {
      console.log('🔧 Mock: Получение типов работ');
      
      // Получаем типы работ через старый метод
      const legacyWorkTypes = await this.mockAPI.getWorkTypes();
      
      const workTypes = legacyWorkTypes.map(wt => ({
        id: wt.id,
        name: wt.name
      }));
      
      console.log(`✅ Mock: Найдено типов работ: ${workTypes.length}`);
      return {
        success: true,
        data: workTypes,
        message: `Найдено типов работ: ${workTypes.length}`
      };
      
    } catch (error: any) {
      console.error('❌ Mock API Error (getWorkTypes):', error.message);
      return {
        success: false,
        data: [],
        message: `Ошибка Mock API: ${error.message}`
      };
    }
  }

  // Вспомогательный метод для форматирования даты
  private formatDateFromAPI(apiDate: string): string {
    if (!apiDate || apiDate.length < 8) return new Date().toISOString().split('T')[0];
    
    // Формат API: "YYYYMMDDHHMMSS"
    const year = apiDate.substring(0, 4);
    const month = apiDate.substring(4, 6);
    const day = apiDate.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  }
}
