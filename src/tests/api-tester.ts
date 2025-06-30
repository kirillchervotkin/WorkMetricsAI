import axios, { AxiosResponse } from 'axios';

interface TestResult {
  endpoint: string;
  method: string;
  params?: any;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
}

class DocumentAPITester {
  private baseURL = 'https://base.itplan.ru:7071/DO_Dev3/hs/api';
  private auth = {
    username: 'exchange_api_user',
    password: 'e@CMw9%Q$oqGVdsE{w'
  };

  private client = axios.create({
    baseURL: this.baseURL,
    auth: this.auth,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    },
    httpsAgent: new (require('https').Agent)({
      rejectUnauthorized: false
    })
  });

  async testEndpoint(endpoint: string, method: 'GET' | 'POST' = 'GET', params?: any, data?: any): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 Тестируем: ${method} ${endpoint}`);
      if (params) console.log(`📋 Параметры:`, params);
      if (data) console.log(`📄 Данные:`, data);

      let response: AxiosResponse;
      
      if (method === 'GET') {
        response = await this.client.get(endpoint, { params });
      } else {
        response = await this.client.post(endpoint, data, { params });
      }

      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Успех! Статус: ${response.status}, Время: ${responseTime}ms`);
      console.log(`📊 Структура ответа:`, this.analyzeStructure(response.data));
      console.log(`📄 Первые данные:`, JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

      return {
        endpoint,
        method,
        params,
        status: response.status,
        success: true,
        data: response.data,
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      console.log(`❌ Ошибка! Статус: ${error.response?.status || 'N/A'}, Время: ${responseTime}ms`);
      console.log(`💬 Сообщение:`, error.response?.data || error.message);

      return {
        endpoint,
        method,
        params,
        status: error.response?.status || 0,
        success: false,
        error: error.response?.data || error.message,
        responseTime
      };
    }
  }

  private analyzeStructure(data: any): string {
    if (Array.isArray(data)) {
      return `Array[${data.length}] ${data.length > 0 ? `первый элемент: ${this.getObjectStructure(data[0])}` : 'пустой'}`;
    } else if (typeof data === 'object' && data !== null) {
      return `Object ${this.getObjectStructure(data)}`;
    } else {
      return `${typeof data}: ${data}`;
    }
  }

  private getObjectStructure(obj: any): string {
    if (!obj || typeof obj !== 'object') return typeof obj;
    const keys = Object.keys(obj);
    return `{${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}}`;
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Запуск полного тестирования API документооборота');
    console.log(`🌐 Базовый URL: ${this.baseURL}`);
    console.log(`🔐 Пользователь: ${this.auth.username}`);
    
    const results: TestResult[] = [];

    // 1. Тест получения типов работ
    results.push(await this.testEndpoint('/worktypes'));

    // 2. Тест получения пользователей (разные варианты)
    results.push(await this.testEndpoint('/users', 'GET', { users: '' }));
    results.push(await this.testEndpoint('/users', 'GET', { userId: '' }));
    results.push(await this.testEndpoint('/users', 'GET', { users: 'Червоткин' }));
    results.push(await this.testEndpoint('/users', 'GET', { userId: 'Червоткин' }));
    results.push(await this.testEndpoint('/users', 'GET', { users: 'Золотарев' }));

    // 3. Тест получения задач
    results.push(await this.testEndpoint('/tasks'));
    results.push(await this.testEndpoint('/tasks', 'GET', { userId: '5d99b0f7-6675-11ee-b922-b52194aab495' }));

    // 4. Тест получения трудозатрат
    results.push(await this.testEndpoint('/stufftime'));
    results.push(await this.testEndpoint('/stufftime', 'GET', { 
      from: '20241201000000', 
      to: '20241231235959' 
    }));

    // 5. Тест получения проектов
    results.push(await this.testEndpoint('/project', 'GET', { projectName: 'АйТи План' }));
    results.push(await this.testEndpoint('/project', 'GET', { projectName: 'Развитие' }));

    // 6. Тест аутентификации (если нужно)
    // results.push(await this.testEndpoint('/auth', 'POST', undefined, {
    //   userName: 'testuser',
    //   passHash: 'testhash'
    // }));

    return results;
  }

  printSummary(results: TestResult[]): void {
    console.log('\n📊 СВОДКА РЕЗУЛЬТАТОВ ТЕСТИРОВАНИЯ:');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Успешных запросов: ${successful.length}`);
    console.log(`❌ Неудачных запросов: ${failed.length}`);
    console.log(`⏱️ Среднее время ответа: ${Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)}ms`);

    console.log('\n🔍 ДЕТАЛИ ПО ENDPOINTS:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const params = result.params ? ` (${JSON.stringify(result.params)})` : '';
      console.log(`${status} ${result.method} ${result.endpoint}${params} - ${result.status} (${result.responseTime}ms)`);
      
      if (!result.success) {
        console.log(`   💬 ${result.error}`);
      }
    });

    console.log('\n📋 РЕКОМЕНДАЦИИ:');
    
    // Анализ результатов пользователей
    const userTests = results.filter(r => r.endpoint === '/users');
    const successfulUserTests = userTests.filter(r => r.success);
    
    if (successfulUserTests.length > 0) {
      console.log('👥 Для получения пользователей используйте:');
      successfulUserTests.forEach(test => {
        console.log(`   ✅ ${JSON.stringify(test.params)}`);
      });
    }

    // Анализ результатов задач
    const taskTests = results.filter(r => r.endpoint === '/tasks');
    const successfulTaskTests = taskTests.filter(r => r.success);
    
    if (successfulTaskTests.length > 0) {
      console.log('📋 Для получения задач используйте:');
      successfulTaskTests.forEach(test => {
        console.log(`   ✅ ${test.params ? JSON.stringify(test.params) : 'без параметров'}`);
      });
    }

    // Анализ результатов трудозатрат
    const stufftimeTests = results.filter(r => r.endpoint === '/stufftime');
    const successfulStufftimeTests = stufftimeTests.filter(r => r.success);
    
    if (successfulStufftimeTests.length > 0) {
      console.log('⏱️ Для получения трудозатрат используйте:');
      successfulStufftimeTests.forEach(test => {
        console.log(`   ✅ ${test.params ? JSON.stringify(test.params) : 'без параметров'}`);
      });
    }
  }

  async testSpecificEndpoint(endpoint: string, params?: any): Promise<void> {
    console.log(`\n🎯 Детальное тестирование: ${endpoint}`);
    const result = await this.testEndpoint(endpoint, 'GET', params);
    
    if (result.success && result.data) {
      console.log('\n📄 ПОЛНЫЙ ОТВЕТ:');
      console.log(JSON.stringify(result.data, null, 2));
      
      if (Array.isArray(result.data) && result.data.length > 0) {
        console.log('\n🔍 АНАЛИЗ СТРУКТУРЫ ПЕРВОГО ЭЛЕМЕНТА:');
        const firstItem = result.data[0];
        Object.keys(firstItem).forEach(key => {
          console.log(`   ${key}: ${typeof firstItem[key]} = ${firstItem[key]}`);
        });
      }
    }
  }
}

export { DocumentAPITester, TestResult };
