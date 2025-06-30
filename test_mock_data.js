const { MockDocumentAPI } = require('./dist/implementations/MockDocumentAPI');

async function testMockData() {
  console.log('🧪 Тестирование расширенных Mock данных...\n');
  
  const mockAPI = new MockDocumentAPI();
  
  try {
    console.log('1️⃣ Тестирование поиска пользователей:');
    const users = await mockAPI.getUsersByNames('Петров,Сидорова,Козлов');
    console.log(`   Найдено пользователей: ${users.length}`);
    users.forEach(user => console.log(`   - ${user.userName}`));
    
    console.log('\n2️⃣ Тестирование получения проектов:');
    const project1 = await mockAPI.getProjectByName('ГЕРОФАРМ');
    const project2 = await mockAPI.getProjectByName('Яндекс');
    console.log(`   ГЕРОФАРМ: ${project1 ? '✅ Найден' : '❌ Не найден'}`);
    console.log(`   Яндекс: ${project2 ? '✅ Найден' : '❌ Не найден'}`);
    
    console.log('\n3️⃣ Тестирование типов работ:');
    const workTypes = await mockAPI.getWorkTypes();
    console.log(`   Всего типов работ: ${workTypes.length}`);
    console.log(`   Примеры: ${workTypes.slice(0, 5).map(wt => wt.name).join(', ')}`);
    
    console.log('\n4️⃣ Тестирование задач:');
    const tasks = await mockAPI.getTasksByUserId('test-user');
    console.log(`   Всего задач: ${tasks.length}`);
    tasks.forEach(task => console.log(`   - ${task.name}`));
    
    console.log('\n5️⃣ Тестирование данных о времени:');
    const timeData = await mockAPI.getStuffTime({ userId: '' });
    console.log(`   Всего записей времени: ${timeData.length}`);
    
    let totalMinutes = 0;
    timeData.forEach(userData => {
      totalMinutes += userData.countOfMinutes;
      console.log(`   - ${userData.user}: ${userData.countOfMinutes} мин (${userData.stufftime.length} записей)`);
    });
    
    console.log(`\n📊 Общая статистика:`);
    console.log(`   Общее время работы: ${totalMinutes} минут (${Math.round(totalMinutes/60)} часов)`);
    console.log(`   Среднее время на сотрудника: ${Math.round(totalMinutes/timeData.length)} минут`);
    
    console.log('\n✅ Все тесты пройдены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

testMockData();
