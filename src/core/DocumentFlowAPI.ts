import axios, { AxiosInstance } from 'axios';
import https from 'https';

export interface TimeTrackingData {
  user: string;
  countOfMinutes: number;
  stufftime: Array<{
    description: string;
    countOfMinutes: number;
  }>;
}

export interface TaskData {
  id: string;
  name: string;
  deadline: string;
}

export interface UserData {
  userName: string;
  userId: string;
}

export class DocumentFlowAPI {
  private client: AxiosInstance;
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    this.baseUrl = process.env.DO_API_URL || "https://base.itplan.ru:7071/DO/hs/api";
    
    const username = process.env.DO_API_USERNAME || "exchange_api_user";
    const password = process.env.DO_API_PASSWORD || "";
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Authorization": this.authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    console.log('📡 DocumentFlowAPI initialized');
  }

  async getUserTasks(userId: string): Promise<TaskData[]> {
    try {
      console.log(`📋 Получение задач пользователя: ${userId}`);
      const response = await this.client.get(`/tasks?userId=${userId}`);
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения задач:', error.message);
      return [];
    }
  }

  async getUsers(names?: string[]): Promise<UserData[]> {
    try {
      console.log('👥 Получение пользователей');
      
      if (names && names.length > 0) {
        const response = await this.client.get(`/users?users=${names.join(',')}`);
        return response.data || [];
      } else {
        // Получаем всех пользователей через поиск по буквам
        const allUsers: UserData[] = [];
        const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'И', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т'];
        
        for (const letter of letters) {
          try {
            const response = await this.client.get(`/users?users=${letter}`);
            if (response.data && response.data.length > 0) {
              allUsers.push(...response.data);
            }
          } catch (error) {
            continue;
          }
        }
        
        // Убираем дубликаты
        const uniqueUsers = allUsers.filter((user, index, self) => 
          index === self.findIndex(u => u.userId === user.userId)
        );
        
        return uniqueUsers;
      }
    } catch (error: any) {
      console.error('❌ Ошибка получения пользователей:', error.message);
      return [];
    }
  }

  async getTimeTracking(params: {
    userIds?: string[];
    projectId?: string;
    dateFrom: string;
    dateTo: string;
  }): Promise<TimeTrackingData[]> {
    try {
      console.log('⏱️ Получение трудозатрат:', params);
      
      const queryParams: any = {
        from: params.dateFrom,
        to: params.dateTo
      };
      
      if (params.userIds && params.userIds.length > 0) {
        queryParams.userId = params.userIds.join(',');
      }
      
      if (params.projectId) {
        queryParams.projectId = params.projectId;
      }

      const response = await this.client.get('/stufftime', { params: queryParams });
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения трудозатрат:', error.message);
      return [];
    }
  }

  async getProjects(): Promise<any[]> {
    try {
      console.log('🏗️ Получение проектов');
      const response = await this.client.get('/project');
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения проектов:', error.message);
      return [];
    }
  }

  async getWorkTypes(): Promise<any[]> {
    try {
      console.log('⚙️ Получение типов работ');
      const response = await this.client.get('/worktypes');
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения типов работ:', error.message);
      return [];
    }
  }

  async checkOverdueTasks(userId: string): Promise<{ result: boolean }> {
    try {
      console.log(`⚠️ Проверка просроченных задач: ${userId}`);
      const response = await this.client.get(`/checkOverdueTasks?userId=${userId}`);
      return response.data || { result: false };
    } catch (error: any) {
      console.error('❌ Ошибка проверки просроченных задач:', error.message);
      return { result: false };
    }
  }

  // Утилиты для извлечения данных из запросов
  extractUserIds(text: string, users: UserData[]): string[] {
    const foundUsers: string[] = [];
    const textLower = text.toLowerCase();
    
    for (const user of users) {
      const nameParts = user.userName.toLowerCase().split(' ');
      for (const part of nameParts) {
        if (part.length > 2 && textLower.includes(part)) {
          foundUsers.push(user.userId);
          break;
        }
      }
    }
    
    return foundUsers;
  }

  extractDateRange(text: string): [string, string] {
    const today = new Date();
    const textLower = text.toLowerCase();
    
    if (textLower.includes('вчера')) {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      return [dateStr + '000000', dateStr + '235959'];
    }
    
    if (textLower.includes('неделю')) {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fromStr = weekAgo.toISOString().split('T')[0].replace(/-/g, '');
      const toStr = today.toISOString().split('T')[0].replace(/-/g, '');
      return [fromStr + '000000', toStr + '235959'];
    }
    
    if (textLower.includes('месяц')) {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fromStr = monthAgo.toISOString().split('T')[0].replace(/-/g, '');
      const toStr = today.toISOString().split('T')[0].replace(/-/g, '');
      return [fromStr + '000000', toStr + '235959'];
    }

    // Извлечение конкретных месяцев и годов
    const monthNames = {
      'январ': 0, 'феврал': 1, 'март': 2, 'апрел': 3, 'май': 4, 'июн': 5,
      'июл': 6, 'август': 7, 'сентябр': 8, 'октябр': 9, 'ноябр': 10, 'декабр': 11
    };
    
    const yearMatch = text.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();
    
    let month = null;
    for (const [name, index] of Object.entries(monthNames)) {
      if (textLower.includes(name)) {
        month = index;
        break;
      }
    }
    
    if (month !== null) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const fromStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
      const toStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
      return [fromStr + '000000', toStr + '235959'];
    }
    
    // По умолчанию - последние 7 дней
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromStr = weekAgo.toISOString().split('T')[0].replace(/-/g, '');
    const toStr = today.toISOString().split('T')[0].replace(/-/g, '');
    return [fromStr + '000000', toStr + '235959'];
  }
}
