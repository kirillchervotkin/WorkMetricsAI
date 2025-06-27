

export interface User {
  userName: string;
  userId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  status: string;
  hours?: number;
}

export interface TimeEntry {
  id: string;
  userId: string;
  description: string;
  countOfMinutes: number;
  date: string;
  taskId?: string;
  projectId?: string;
  workTypeId?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface WorkType {
  id: string;
  name: string;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: any;
}

export interface IUser {
  userName: string;
  userId: string;
}

export interface ITask {
  name: string;
  id: string;
  deadline: string;
}

export interface IProject {
  name: string;
  id: string;
}

export interface IWorkType {
  name: string;
  id: string;
}

export interface IStuffTimeEntry {
  description: string;
  countOfMinutes: number;
}

export interface IUserStuffTime {
  user: string;
  countOfMinutes: number;
  stufftime: IStuffTimeEntry[];
}

export interface IAuthRequest {
  userName: string;
  passHash: string;
}

export interface IAuthResponse {
  userName: string;
  fullUserName: string;
  userId: string;
  permission: string;
}

export interface IAddStuffTimeRequest {
  taskId: string;
  userId: string;
  workTypeId: string;
  dateTime: string;
  countOfMinutes: number;
  description: string;
}

export interface IStuffTimeParams {
  userId?: string;
  projectId?: string;
  from?: string;
  to?: string;
}

export interface ILegacyDocumentAPI {
  authenticate(request: IAuthRequest): Promise<IAuthResponse>;
  getUserByLogin(login: string): Promise<IUser | null>;
  getUsersByNames(names: string): Promise<IUser[]>;
  getTaskByName(userId: string, taskName: string): Promise<ITask | null>;
  getTasksByUserId(userId: string): Promise<ITask[]>;
  getProjectByName(projectName: string): Promise<IProject | null>;
  getProjectTaskByName(projectTaskName: string): Promise<ITask | null>;
  getWorkTypes(): Promise<IWorkType[]>;
  getStuffTime(params: IStuffTimeParams): Promise<IUserStuffTime[]>;
  addStuffTime(request: IAddStuffTimeRequest): Promise<{ success?: string; error?: string }>;
  checkOverdueTasks(userId: string): Promise<{ result: boolean }>;
}

export interface IDocumentAPI {
  getUsersByNames(params: { names: string[] }): Promise<APIResponse<User[]>>;
  getEmployeeTasks(params: {
    employee_name?: string;
    userId?: string;
    limit?: number
  }): Promise<APIResponse<Task[]>>;
  getTimeEntries(params: {
    employee_name?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number
  }): Promise<APIResponse<TimeEntry[]>>;
  getProjects(params: { name?: string; limit?: number }): Promise<APIResponse<Project[]>>;
  getWorkTypes(): Promise<APIResponse<WorkType[]>>;
}
