import { NameExtractor } from '../services/NameExtractor';

async function testNameExtractor() {
  console.log('🧪 Тестирование NameExtractor');
  console.log('=' .repeat(40));

  const extractor = new NameExtractor();

  const testCases = [
    {
      query: "Что делал Кирилл червоткин вчера?",
      expected: "Кирилл"
    },
    {
      query: "Задачи Золотарева",
      expected: "Золотарева"
    },
    {
      query: "Сколько работал Иван Петров?",
      expected: "Иван"
    },
    {
      query: "Червоткин Кирилл Сергеевич работал над проектом",
      expected: "Червоткин"
    },
    {
      query: "Список всех сотрудников",
      expected: null
    },
    {
      query: "Статистика по проектам",
      expected: null
    },
    {
      query: "Что делает команда?",
      expected: null
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Тест: "${testCase.query}"`);
    
    const result = extractor.extractEmployeeNameSimple(testCase.query);
    
    if (result === testCase.expected) {
      console.log(`✅ Успех: "${result}"`);
    } else {
      console.log(`❌ Ошибка: ожидали "${testCase.expected}", получили "${result}"`);
    }
  }

  console.log('\n✅ Тестирование завершено');
}

if (require.main === module) {
  testNameExtractor().catch(console.error);
}

export { testNameExtractor };
