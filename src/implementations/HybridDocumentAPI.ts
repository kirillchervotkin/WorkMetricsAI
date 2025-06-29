import { IDocumentAPI, User, Task, TimeEntry, Project, WorkType, APIResponse } from '../interfaces/IDocumentAPI';
import { RealDocumentAPI } from './RealDocumentAPI';
import { MockDocumentAPINew } from './MockDocumentAPINew';

/**
 * Гибридная реализация API - пробует реальный API, при неудаче использует Mock
 */
export class HybridDocumentAPI implements IDocumentAPI {
  private realAPI: RealDocumentAPI;
  private mockAPI: MockDocumentAPINew;
  private useRealAPI: boolean = true;

  constructor() {
    this.realAPI = new RealDocumentAPI();
    this.mockAPI = new MockDocumentAPINew();
    
    console.log('🔄 Hybrid DocumentAPI initialized - Real API with Mock fallback');
    
    // Тестируем подключение к реальному API при инициализации
    this.testRealAPIConnection();
  }

  private async testRealAPIConnection(): Promise<void> {
    try {
      console.log('🔌 Testing Real API connection...');
      
      // Пробуем простой запрос к реальному API
      const testResult = await this.realAPI.getWorkTypes();
      
      if (testResult.success) {
        console.log('✅ Real API connection successful!');
        this.useRealAPI = true;
      } else {
        console.log('⚠️ Real API test failed, will use Mock API as fallback');
        this.useRealAPI = false;
      }
    } catch (error) {
      console.log('⚠️ Real API connection failed, using Mock API as fallback');
      this.useRealAPI = false;
    }
  }

  private async tryRealAPIWithFallback<T>(
    realAPICall: () => Promise<APIResponse<T>>,
    mockAPICall: () => Promise<APIResponse<T>>,
    operationName: string
  ): Promise<APIResponse<T>> {
    
    if (!this.useRealAPI) {
      console.log(`🎭 Using Mock API for ${operationName}`);
      return await mockAPICall();
    }

    try {
      console.log(`🌐 Trying Real API for ${operationName}`);
      const result = await realAPICall();
      
      if (result.success) {
        console.log(`✅ Real API success for ${operationName}`);
        return result;
      } else {
        console.log(`⚠️ Real API returned error for ${operationName}, falling back to Mock`);
        return await mockAPICall();
      }
    } catch (error: any) {
      console.log(`❌ Real API failed for ${operationName}, falling back to Mock:`, error.message);
      return await mockAPICall();
    }
  }

  async getUsersByNames(params: { names: string[] }): Promise<APIResponse<User[]>> {
    return this.tryRealAPIWithFallback(
      () => this.realAPI.getUsersByNames(params),
      () => this.mockAPI.getUsersByNames(params),
      'getUsersByNames'
    );
  }

  async getAllUsers(): Promise<APIResponse<User[]>> {
    return this.tryRealAPIWithFallback(
      () => this.realAPI.getAllUsers(),
      () => this.mockAPI.getUsersByNames({ names: [""] }), // Fallback для Mock API
      'getAllUsers'
    );
  }

  async getEmployeeTasks(params: { 
    employee_name?: string; 
    userId?: string; 
    limit?: number 
  }): Promise<APIResponse<Task[]>> {
    return this.tryRealAPIWithFallback(
      () => this.realAPI.getEmployeeTasks(params),
      () => this.mockAPI.getEmployeeTasks(params),
      'getEmployeeTasks'
    );
  }

  async getTimeEntries(params: { 
    employee_name?: string; 
    userId?: string; 
    startDate?: string; 
    endDate?: string; 
    limit?: number 
  }): Promise<APIResponse<TimeEntry[]>> {
    return this.tryRealAPIWithFallback(
      () => this.realAPI.getTimeEntries(params),
      () => this.mockAPI.getTimeEntries(params),
      'getTimeEntries'
    );
  }

  async getProjects(params: { name?: string; limit?: number }): Promise<APIResponse<Project[]>> {
    return this.tryRealAPIWithFallback(
      () => this.realAPI.getProjects(params),
      () => this.mockAPI.getProjects(params),
      'getProjects'
    );
  }

  async getWorkTypes(): Promise<APIResponse<WorkType[]>> {
    return this.tryRealAPIWithFallback(
      () => this.realAPI.getWorkTypes(),
      () => this.mockAPI.getWorkTypes(),
      'getWorkTypes'
    );
  }

  // Дополнительные методы для управления
  async switchToRealAPI(): Promise<APIResponse<any>> {
    console.log('🔄 Switching to Real API...');
    await this.testRealAPIConnection();
    
    return {
      success: this.useRealAPI,
      data: { mode: this.useRealAPI ? 'real' : 'mock' },
      message: this.useRealAPI ? 'Switched to Real API' : 'Real API unavailable, using Mock'
    };
  }

  switchToMockAPI(): APIResponse<any> {
    console.log('🎭 Switching to Mock API...');
    this.useRealAPI = false;
    
    return {
      success: true,
      data: { mode: 'mock' },
      message: 'Switched to Mock API'
    };
  }

  getCurrentMode(): string {
    return this.useRealAPI ? 'real' : 'mock';
  }

  async getStatus(): Promise<APIResponse<any>> {
    const realAPIStatus = await this.testRealAPIConnection();
    
    return {
      success: true,
      data: {
        currentMode: this.getCurrentMode(),
        realAPIAvailable: this.useRealAPI,
        mockAPIAvailable: true
      },
      message: `Current mode: ${this.getCurrentMode()}`
    };
  }
}
