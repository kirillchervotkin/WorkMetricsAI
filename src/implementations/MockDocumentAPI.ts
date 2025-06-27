import {
  IDocumentAPI,
  ILegacyDocumentAPI,
  User,
  Task,
  TimeEntry,
  Project,
  WorkType,
  APIResponse,
  IUser,
  ITask,
  IProject,
  IWorkType,
  IUserStuffTime,
  IAuthRequest,
  IAuthResponse,
  IAddStuffTimeRequest,
  IStuffTimeParams
} from "../interfaces/IDocumentAPI";

export class MockDocumentAPI implements ILegacyDocumentAPI {
  private users: IUser[] = [
    { userName: "Золотарев Сергей Александрович", userId: "5d99b0f7-6675-11ee-b922-b52194aab495" },
    { userName: "Червоткин Кирилл Сергеевич", userId: "7d44b0f7-3313-11ee-b922-b52194aab947" },
    { userName: "Артем Разработчик", userId: "8e55c1f8-4424-22ff-c933-c63295bbc058" },
    { userName: "Мария Тестировщик", userId: "9f66d2f9-5535-33gg-d044-d74306ccd169" },
    { userName: "Иван Аналитик", userId: "0a77e3fa-6646-44hh-e155-e85417dde270" }
  ];

  private projects: IProject[] = [
    { name: "АйТи План - Подбор и развитие компетенций персонала", id: "745bb100-bedf-11ef-b92a-f86c91893b43" },
    { name: "Telegram Bot - Система документооборота", id: "856cc211-cfea-22fa-c93b-a97d94bba554" },
    { name: "АСКОНА ТД - Исправление характеристик в документах", id: "967dd322-daeb-33ab-da4c-ba8e05ccb665" },
    { name: "Развитие программистов - Освоение новых технологий", id: "a78ee433-ebfc-44bc-eb5d-cb9f16ddc776" }
  ];

  private workTypes: IWorkType[] = [
    { name: "Административные работы", id: "457a0f87-5250-11ea-a99d-005056905560" },
    { name: "Анализ/Обследование", id: "7f030f0a-524c-11ea-a99d-005056905560" },
    { name: "Встреча", id: "a35f1699-642a-11ea-a9a1-005056905560" },
    { name: "Разработка", id: "b46f2700-753b-22eb-ba02-006067906671" },
    { name: "Тестирование", id: "c57f3811-864c-33fc-cb13-117178a17782" },
    { name: "Документирование", id: "d68f4922-975d-44ad-dc24-228289b28893" }
  ];

  private tasks: ITask[] = [
    {
      name: "АйТи План - Развитие программистов - Освоение GIT",
      id: "df82c5fd-7cc7-11ef-b929-d4b632d8a8a3",
      deadline: "20250730235959"
    },
    {
      name: "Telegram Bot - Разработка парсера естественного языка",
      id: "ef93d6fe-8dd8-22fa-ca3a-e5c743e9b4b4",
      deadline: "20250630235959"
    },
    {
      name: "АСКОНА ТД - Исправление чужой характеристики в документах",
      id: "fa052f4e-a645-11ef-b929-d4b632d8a8a3",
      deadline: "20250715235959"
    },
    {
      name: "АйТи План - Ознакомление с новостями",
      id: "745bb100-bedf-11ef-b92a-f86c91893b43",
      deadline: "20250705235959"
    },
    {
      name: "Telegram Bot - Интеграция с Gemini API",
      id: "0b14e5ff-9ee9-33ab-db4b-f6d854fac5c5",
      deadline: "20250628235959"
    }
  ];

  async authenticate(request: IAuthRequest): Promise<IAuthResponse> {
    await this.delay(200);

    console.log("🔐 Mock: Аутентификация пользователя", request.userName);

    if (request.userName && request.passHash) {
      return {
        userName: request.userName,
        fullUserName: `${request.userName} (Полное имя)`,
        userId: "mock-user-id-" + Date.now(),
        permission: "mock-permission-id"
      };
    }
    
    throw new Error("Неверные учетные данные");
  }

  async getUserByLogin(login: string): Promise<IUser | null> {
    await this.delay(150);
    console.log("👤 Mock: Поиск пользователя по логину", login);

    return {
      login: login,
      userName: "Пользователь по логину " + login,
      userId: "mock-login-user-" + login.replace('@', '')
    } as any;
  }

  async getUsersByNames(names: string): Promise<IUser[]> {
    await this.delay(200);
    console.log("👥 Mock: Поиск пользователей по именам", names);
    
    const searchNames = names.toLowerCase().split(',').map(n => n.trim());
    const foundUsers = this.users.filter(user => 
      searchNames.some(searchName => 
        user.userName.toLowerCase().includes(searchName)
      )
    );
    
    return foundUsers;
  }

  async getTaskByName(userId: string, taskName: string): Promise<ITask | null> {
    await this.delay(150);
    console.log("📋 Mock: Поиск задачи по названию", { userId, taskName });
    
    const task = this.tasks.find(t => 
      t.name.toLowerCase().includes(taskName.toLowerCase())
    );
    
    return task || null;
  }

  async getTasksByUserId(userId: string): Promise<ITask[]> {
    await this.delay(200);
    console.log("📋 Mock: Получение задач пользователя", userId);

    const userTasks = this.tasks.slice(0, 3);
    return userTasks;
  }

  async getProjectByName(projectName: string): Promise<IProject | null> {
    await this.delay(150);
    console.log("🏗️ Mock: Поиск проекта по названию", projectName);
    
    const project = this.projects.find(p => 
      p.name.toLowerCase().includes(projectName.toLowerCase())
    );
    
    return project || null;
  }

  async getProjectTaskByName(projectTaskName: string): Promise<ITask | null> {
    await this.delay(150);
    console.log("🏗️📋 Mock: Поиск проектной задачи", projectTaskName);
    
    const task = this.tasks.find(t => 
      t.name.toLowerCase().includes(projectTaskName.toLowerCase())
    );
    
    return task || null;
  }

  async getWorkTypes(): Promise<IWorkType[]> {
    await this.delay(100);
    console.log("⚙️ Mock: Получение видов работ");

    return this.workTypes;
  }

  async getStuffTime(params: IStuffTimeParams): Promise<IUserStuffTime[]> {
    await this.delay(300);
    console.log("⏱️ Mock: Получение трудозатрат", params);

    const allTimeData: IUserStuffTime[] = [
      {
        user: "Артем Разработчик",
        countOfMinutes: 480,
        stufftime: [
          {
            description: "Разработка Telegram-бота документооборота с интеграцией Gemini AI",
            countOfMinutes: 180
          },
          {
            description: "Настройка IoC контейнера и создание mock реализации API",
            countOfMinutes: 120
          },
          {
            description: "Интеграция с OpenRouter для доступа к Gemini 2.5 Flash Lite",
            countOfMinutes: 90
          },
          {
            description: "Создание универсального парсера запросов пользователей",
            countOfMinutes: 90
          }
        ]
      },
      {
        user: "Червоткин Кирилл Сергеевич",
        countOfMinutes: 360,
        stufftime: [
          {
            description: "Код-ревью и тестирование новых функций бота",
            countOfMinutes: 150
          },
          {
            description: "Документирование API и создание примеров использования",
            countOfMinutes: 120
          },
          {
            description: "Анализ производительности и оптимизация запросов",
            countOfMinutes: 90
          }
        ]
      },
      {
        user: "Золотарев Сергей Александрович",
        countOfMinutes: 420,
        stufftime: [
          {
            description: "Архитектурное планирование системы документооборота",
            countOfMinutes: 180
          },
          {
            description: "Встреча с командой по техническим требованиям",
            countOfMinutes: 120
          },
          {
            description: "Административные работы и планирование спринта",
            countOfMinutes: 120
          }
        ]
      },
      {
        user: "Мария Тестировщик",
        countOfMinutes: 300,
        stufftime: [
          {
            description: "Тестирование функциональности Telegram-бота",
            countOfMinutes: 180
          },
          {
            description: "Создание тест-кейсов для API интеграции",
            countOfMinutes: 120
          }
        ]
      },
      {
        user: "Иван Аналитик",
        countOfMinutes: 240,
        stufftime: [
          {
            description: "Анализ требований к системе документооборота",
            countOfMinutes: 120
          },
          {
            description: "Подготовка технической документации",
            countOfMinutes: 120
          }
        ]
      }
    ];

    if (params.userId) {
      console.log("🔍 Фильтрация по userId:", params.userId);

      const userIds = params.userId.split(',');
      const filteredData: IUserStuffTime[] = [];

      for (const userId of userIds) {
        const user = this.users.find(u => u.userId === userId.trim());
        if (user) {
          console.log("👤 Найден пользователь:", user.userName);

          const userData = allTimeData.find(data =>
            data.user.includes(user.userName.split(' ')[0]) ||
            data.user === user.userName
          );

          if (userData) {
            console.log("⏱️ Найдены трудозатраты для:", userData.user);
            filteredData.push(userData);
          } else {
            console.log("❌ Трудозатраты не найдены для:", user.userName);
          }
        } else {
          console.log("❌ Пользователь не найден по ID:", userId);
        }
      }

      return filteredData;
    }

    console.log("📊 Возвращаем все трудозатраты");
    return allTimeData;
  }

  async addStuffTime(request: IAddStuffTimeRequest): Promise<{ success?: string; error?: string }> {
    await this.delay(250);
    console.log("➕ Mock: Добавление трудозатрат", request);

    return {
      success: "Запись о трудозатратах успешно добавлена (Mock)"
    };
  }

  async checkOverdueTasks(userId: string): Promise<{ result: boolean }> {
    await this.delay(100);
    console.log("⚠️ Mock: Проверка просроченных задач", userId);

    return {
      result: Math.random() > 0.5
    };
  }


  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
