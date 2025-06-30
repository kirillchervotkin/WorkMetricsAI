import { DocumentAPITester } from './api-tester';

class SpecificAPITests {
  private tester = new DocumentAPITester();

  async testUserRetrieval() {
    console.log('\n👥 ТЕСТИРОВАНИЕ ПОЛУЧЕНИЯ ПОЛЬЗОВАТЕЛЕЙ');
    console.log('=' .repeat(40));

    const testCases = [
      // Тестируем разные параметры
      { users: '' },
      { userId: '' },
      { users: 'Червоткин' },
      { userId: 'Червоткин' },
      { users: 'Золотарев' },
      { userId: 'Золотарев' },
      { users: 'Червоткин,Золотарев' },
      { userId: 'Червоткин,Золотарев' },
      // Тестируем частичные совпадения
      { users: 'Черв' },
      { users: 'Кирилл' },
      { users: 'Сергей' },
      // Тестируем с ошибками
      { users: 'Червотки' },
      { users: 'Кирил' },
    ];

    for (const params of testCases) {
      await this.tester.testSpecificEndpoint('/users', params);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между запросами
    }
  }

  async testTaskRetrieval() {
    console.log('\n📋 ТЕСТИРОВАНИЕ ПОЛУЧЕНИЯ ЗАДАЧ');
    console.log('=' .repeat(40));

    const testCases = [
      // Без параметров
      undefined,
      // С известными userId
      { userId: '5d99b0f7-6675-11ee-b922-b52194aab495' }, // Золотарев
      { userId: '7d44b0f7-3313-11ee-b922-b52194aab947' }, // Червоткин
      // С неизвестными userId
      { userId: 'unknown-user-id' },
      // С пустым userId
      { userId: '' },
    ];

    for (const params of testCases) {
      console.log(`\n📋 Тестируем задачи с параметрами:`, params || 'без параметров');
      await this.tester.testSpecificEndpoint('/tasks', params);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async testStufftimeRetrieval() {
    console.log('\n⏱️ ТЕСТИРОВАНИЕ ПОЛУЧЕНИЯ ТРУДОЗАТРАТ');
    console.log('=' .repeat(40));

    const testCases = [
      // Без параметров
      undefined,
      // За сегодня
      { 
        from: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '000000',
        to: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '235959'
      },
      // За последний месяц
      {
        from: '20241201000000',
        to: '20241231235959'
      },
      // За последнюю неделю
      {
        from: '20241220000000',
        to: '20241227235959'
      },
      // С конкретным пользователем
      {
        userId: '7d44b0f7-3313-11ee-b922-b52194aab947',
        from: '20241201000000',
        to: '20241231235959'
      },
      // С несколькими пользователями
      {
        userId: '5d99b0f7-6675-11ee-b922-b52194aab495,7d44b0f7-3313-11ee-b922-b52194aab947',
        from: '20241201000000',
        to: '20241231235959'
      }
    ];

    for (const params of testCases) {
      console.log(`\n⏱️ Тестируем трудозатраты с параметрами:`, params || 'без параметров');
      await this.tester.testSpecificEndpoint('/stufftime', params);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async testProjectRetrieval() {
    console.log('\n🏗️ ТЕСТИРОВАНИЕ ПОЛУЧЕНИЯ ПРОЕКТОВ');
    console.log('=' .repeat(40));

    const testCases = [
      { projectName: 'АйТи План' },
      { projectName: 'Развитие' },
      { projectName: 'АСКОНА' },
      { projectName: 'программист' },
      { projectName: 'персонал' },
      { projectName: 'неизвестный проект' },
      { projectName: '' },
    ];

    for (const params of testCases) {
      console.log(`\n🏗️ Тестируем проекты с параметрами:`, params);
      await this.tester.testSpecificEndpoint('/project', params);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async testDataConsistency() {
    console.log('\n🔍 ТЕСТИРОВАНИЕ СОГЛАСОВАННОСТИ ДАННЫХ');
    console.log('=' .repeat(40));

    try {
      // Получаем пользователей
      console.log('1. Получаем список пользователей...');
      const usersResult = await this.tester.testEndpoint('/users', 'GET', { users: 'Червоткин' });
      
      if (usersResult.success && usersResult.data && usersResult.data.length > 0) {
        const user = usersResult.data[0];
        console.log(`✅ Найден пользователь: ${user.userName} (ID: ${user.userId})`);

        // Получаем задачи этого пользователя
        console.log('2. Получаем задачи пользователя...');
        const tasksResult = await this.tester.testEndpoint('/tasks', 'GET', { userId: user.userId });
        
        if (tasksResult.success) {
          console.log(`✅ Найдено задач: ${tasksResult.data?.length || 0}`);
        }

        // Получаем трудозатраты этого пользователя
        console.log('3. Получаем трудозатраты пользователя...');
        const stufftimeResult = await this.tester.testEndpoint('/stufftime', 'GET', { 
          userId: user.userId,
          from: '20241201000000',
          to: '20241231235959'
        });
        
        if (stufftimeResult.success) {
          console.log(`✅ Найдено записей времени: ${stufftimeResult.data?.length || 0}`);
          
          if (stufftimeResult.data && stufftimeResult.data.length > 0) {
            const timeEntry = stufftimeResult.data[0];
            console.log(`📊 Пример записи времени:`, {
              user: timeEntry.user,
              minutes: timeEntry.countOfMinutes,
              entries: timeEntry.stufftime?.length || 0
            });
          }
        }

      } else {
        console.log('❌ Не удалось получить пользователей для тестирования согласованности');
      }

    } catch (error) {
      console.error('❌ Ошибка при тестировании согласованности:', error);
    }
  }

  async runAllSpecificTests() {
    console.log('🧪 ЗАПУСК СПЕЦИФИЧЕСКИХ ТЕСТОВ API');
    console.log('=' .repeat(50));

    await this.testUserRetrieval();
    await this.testTaskRetrieval();
    await this.testStufftimeRetrieval();
    await this.testProjectRetrieval();
    await this.testDataConsistency();

    console.log('\n✅ ВСЕ СПЕЦИФИЧЕСКИЕ ТЕСТЫ ЗАВЕРШЕНЫ');
  }
}

async function runSpecificTests() {
  const tester = new SpecificAPITests();
  await tester.runAllSpecificTests();
}

if (require.main === module) {
  runSpecificTests().catch(console.error);
}

export { SpecificAPITests, runSpecificTests };
