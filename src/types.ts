// Типы для API документооборота
export interface Employee {
    id: string;
    name: string;
    email: string;
    department: string;
  }
  
  export interface Project {
    id: string;
    name: string;
    code: string;
    status: "active" | "completed" | "suspended";
    start_date: string;
    end_date?: string;
  }
  
  export interface Task {
    id: string;
    title: string;
    description: string;
    employee_id: string;
    project_id: string;
    hours: number;
    date: string;
    status: "completed" | "in_progress" | "pending";
  }
  
  export interface TimeEntry {
    id: string;
    task_id: string;
    employee_id: string;
    employee_name?: string; // Добавляем имя сотрудника
    project_id: string;
    hours: number;
    date: string;
    description: string;
  }
  
  // Типы для парсинга запросов
  export interface ParsedQuery {
    employee_name?: string;
    project_name?: string;
    start_date?: string;
    end_date?: string;
    query_type: string; // Универсальный тип - любая строка
    intent: string; // Намерение пользователя
    entities: string[]; // Извлеченные сущности
  }
  
  // Ответы API
  export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    total?: number;
    page?: number;
    limit?: number;
  }
  