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
      const response = await this.api.getUsersByNames({ names: [""] });
      if (response.success) {
        const employees: Employee[] = response.data.map(user => ({
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
          message: response.message
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
      const response = await this.api.getEmployeeTasks({
        employee_name: params.employee_name,
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

  async getTimeEntries(params: { 
    employee_name?: string; 
    start_date?: string; 
    end_date?: string; 
    limit?: number 
  }): Promise<ApiResponse<TimeEntry[]>> {
    try {
      const response = await this.api.getTimeEntries({
        employee_name: params.employee_name,
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
          work_type: "",
          employee_name: entry.employee_name || "Неизвестный"
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
      console.log('🔄 Загружаем все данные из ДО...');
      
      const [workTypes, employees, tasks, timeEntries, projects] = await Promise.all([
        this.getWorkTypes(),
        this.getAllEmployees(),
        this.getEmployeeTasks({ employee_name: params.employee_name }),
        this.getTimeEntries({ 
          employee_name: params.employee_name,
          start_date: params.start_date,
          end_date: params.end_date
        }),
        this.getProjects({})
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
