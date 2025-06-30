import { DocumentAPITester } from './api-tester';

async function main() {
  const tester = new DocumentAPITester();

  console.log('🧪 СИСТЕМА ТЕСТИРОВАНИЯ API ДОКУМЕНТООБОРОТА');
  console.log('=' .repeat(50));

  try {
    // Запускаем все тесты
    const results = await tester.runAllTests();
    
    // Выводим сводку
    tester.printSummary(results);

    // Детальное тестирование наиболее важных endpoints
    console.log('\n🔬 ДЕТАЛЬНОЕ ТЕСТИРОВАНИЕ КЛЮЧЕВЫХ ENDPOINTS:');
    console.log('=' .repeat(50));

    // Тестируем stufftime подробно
    await tester.testSpecificEndpoint('/stufftime');
    
    // Тестируем worktypes подробно  
    await tester.testSpecificEndpoint('/worktypes');

    // Тестируем tasks подробно
    await tester.testSpecificEndpoint('/tasks');

    // Тестируем users с разными параметрами
    console.log('\n🔍 ТЕСТИРОВАНИЕ РАЗНЫХ ВАРИАНТОВ ПОЛУЧЕНИЯ ПОЛЬЗОВАТЕЛЕЙ:');
    await tester.testSpecificEndpoint('/users', { users: 'Червоткин' });
    await tester.testSpecificEndpoint('/users', { userId: 'Червоткин' });

  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error);
  }
}

// Запуск тестов
if (require.main === module) {
  main().catch(console.error);
}

export { main as runAPITests };
