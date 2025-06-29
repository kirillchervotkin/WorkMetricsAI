import { SimpleDocumentAPIAdapter } from "../adapters/SimpleDocumentAPIAdapter";
import { ApiResponse, Employee, Project, Task, TimeEntry } from "../types";

export class DocumentAPI {
  private adapter: SimpleDocumentAPIAdapter;

  constructor() {
    this.adapter = new SimpleDocumentAPIAdapter();
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

  async getProjects(_activeOnly: boolean = true): Promise<ApiResponse<Project[]>> {
    return await this.adapter.getProjects({});
  }

  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    return await this.adapter.getAllEmployees();
  }

  async getTimeReport(params: {
    employee_name?: string;
    project_id?: string;
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<TimeEntry[]>> {
    return await this.adapter.getTimeEntries({
      employee_name: params.employee_name,
      start_date: params.start_date,
      end_date: params.end_date
    });
  }

  async findProjectByName(projectName: string): Promise<Project | null> {
    const result = await this.adapter.getProjects({ name: projectName, limit: 1 });
    return result.success && result.data.length > 0 ? result.data[0] : null;
  }

  async getWorkTypes() {
    return await this.adapter.getWorkTypes();
  }
}

// Export singleton instance
export const documentAPI = new DocumentAPI();
