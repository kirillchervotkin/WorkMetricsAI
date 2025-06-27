import { DocumentAPIAdapter } from "../adapters/DocumentAPIAdapter";
import { ApiResponse, Employee, Project, Task, TimeEntry } from "../types";

export class DocumentAPI {
  private adapter: DocumentAPIAdapter;

  constructor() {
    this.adapter = new DocumentAPIAdapter();
    console.log("📡 DocumentAPI initialized with IoC adapter");
  }

  async getEmployeeTasks(params: {
    employee_name?: string;
    project?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<ApiResponse<Task[]>> {
    return await this.adapter.getEmployeeTasks(params);
  }

  async getProjects(activeOnly: boolean = true): Promise<ApiResponse<Project[]>> {
    return await this.adapter.getProjects(activeOnly);
  }

  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    return await this.adapter.getEmployees();
  }

  async getTimeReport(params: {
    employee_name?: string;
    project_id?: string;
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<TimeEntry[]>> {
    return await this.adapter.getTimeReport(params);
  }

  async findProjectByName(projectName: string): Promise<Project | null> {
    return await this.adapter.findProjectByName(projectName);
  }

  async getWorkTypes() {
    return await this.adapter.getWorkTypes();
  }
}

// Export singleton instance
export const documentAPI = new DocumentAPI();
