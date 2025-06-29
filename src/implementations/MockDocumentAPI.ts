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
    { userName: "Артемов Артем Владимирович", userId: "8e55c1f8-4424-22ff-c933-c63295bbc058" },
    { userName: "Мария Ивановна Тестова", userId: "9f66d2f9-5535-33gg-d044-d74306ccd169" },
    { userName: "Иванов Иван Петрович", userId: "0a77e3fa-6646-44hh-e155-e85417dde270" },
    { userName: "Александров Александр Сергеевич", userId: "1b88f4fb-7757-55ii-f266-f96528eef381" },
    { userName: "Алексеев Алексей Михайлович", userId: "2c99g5gc-8868-66jj-g377-ga7639ffg492" },
    { userName: "Андреев Андрей Николаевич", userId: "3daa06hd-9979-77kk-h488-hb8740ggh5a3" },
    { userName: "Анна Сергеевна Петрова", userId: "4ebb17ie-aa8a-88ll-i599-ic9851hhi6b4" },
    { userName: "Антонов Антон Дмитриевич", userId: "5fcc28jf-bb9b-99mm-j6aa-jda962iij7c5" },
    { userName: "Владимиров Владимир Александрович", userId: "6gdd39kg-ccac-aann-k7bb-keb073jjk8d6" },
    { userName: "Дмитриев Дмитрий Владимирович", userId: "7hee4alh-ddbd-bboo-l8cc-lfc184kkl9e7" },
    { userName: "Евгеньев Евгений Андреевич", userId: "8iff5bmi-eece-ccpp-m9dd-mgd295llmaf8" },
    { userName: "Елена Дмитриевна Сидорова", userId: "9jgg6cnj-ffdf-ddqq-naee-nhe3a6mmnbg9" },
    { userName: "Кириллов Кирилл Евгеньевич", userId: "akhhd7ok-ggeg-eerr-obff-oif4b7nnocah" },
    { userName: "Максимов Максим Кириллович", userId: "blii8epl-hhfh-ffss-pcgg-pjg5c8oopdbi" },
    { userName: "Михайлов Михаил Максимович", userId: "cmjj9fqm-iigi-ggtt-qdhh-qkh6d9ppqecj" },
    { userName: "Наталья Михайловна Козлова", userId: "dnkka0grn-jjhj-hhuu-reii-rli7eaqqrfdk" },
    { userName: "Николаев Николай Натальевич", userId: "eollb1hso-kkik-iivv-sfjj-smj8fbrrsgel" },
    { userName: "Ольга Николаевна Морозова", userId: "fpmmcit2p-lljl-jjww-tgkk-tnk9gcssthfm" },
    { userName: "Павлов Павел Ольгович", userId: "gqnndju3q-mmkm-kkxx-uhll-uol0hdttugn" },
    { userName: "Сергеев Сергей Павлович", userId: "hrooekvr4-nnln-llyy-vimm-vpm1ieuuvho" },
    { userName: "Татьяна Сергеевна Волкова", userId: "ispplws5s-oomm-mmzz-wjnn-wqn2jfvvwip" }
  ];

  private projects: IProject[] = [
    { name: "АйТи План - Подбор и развитие компетенций персонала", id: "745bb100-bedf-11ef-b92a-f86c91893b43" },
    { name: "АйТи План - Развитие программистов", id: "fed7b717-7cc6-11ef-b929-d4b632d8a8a3" },
    { name: "АСКОНА ТД (Аскона Хоум)", id: "967dd322-daeb-33ab-da4c-ba8e05ccb665" },
    { name: "WorkMetricsAI - Telegram Bot для документооборота", id: "856cc211-cfea-22fa-c93b-a97d94bba554" },
    { name: "Система управления проектами", id: "a78ee433-ebfc-44bc-eb5d-cb9f16ddc776" },
    { name: "Автоматизация бизнес-процессов", id: "b89ff544-fcad-55cd-fc6e-dc0a27eee887" },
    { name: "Интеграция внешних систем", id: "c9a006655-adbe-66de-ad7f-ed1b38fff998" },
    { name: "Разработка мобильных приложений", id: "da1117766-becf-77ef-be80-fe2c49000aa9" }
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
      deadline: "20241227235959"
    },
    {
      name: "АСКОНА ТД (Аскона Хоум) - Исправление чужой характеристики в документах",
      id: "fa052f4e-a645-11ef-b929-d4b632d8a8a3",
      deadline: "20241215235959"
    },
    {
      name: "АйТи План - Ознакомление с новостями",
      id: "745bb100-bedf-11ef-b92a-f86c91893b43",
      deadline: "20241221235959"
    },
    {
      name: "WorkMetricsAI - Разработка Telegram бота для документооборота",
      id: "ef93d6fe-8dd8-22fa-ca3a-e5c743e9b4b4",
      deadline: "20250115235959"
    },
    {
      name: "WorkMetricsAI - Интеграция с Gemini API",
      id: "0b14e5ff-9ee9-33ab-db4b-f6d854fac5c5",
      deadline: "20250110235959"
    },
    {
      name: "WorkMetricsAI - Разработка парсера естественного языка",
      id: "1c25f600-aff0-44bc-ec5c-g7e965gad6d6",
      deadline: "20250105235959"
    },
    {
      name: "Система управления проектами - Анализ требований",
      id: "2d36g711-b001-55cd-fd6d-h8fa76hbe7e7",
      deadline: "20250120235959"
    },
    {
      name: "Автоматизация бизнес-процессов - Проектирование архитектуры",
      id: "3e47h822-c112-66de-ge7e-i90b87icf8f8",
      deadline: "20250125235959"
    },
    {
      name: "Интеграция внешних систем - Разработка API",
      id: "4f58i933-d223-77ef-hf8f-ja1c98jdg9g9",
      deadline: "20250130235959"
    },
    {
      name: "Разработка мобильных приложений - UI/UX дизайн",
      id: "5069ja44-e334-88f0-ig90-kb2da9keh0ha",
      deadline: "20250201235959"
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
        user: "Золотарев Сергей Александрович",
        countOfMinutes: 330,
        stufftime: [
          {
            description: "Созвон с Кириллом и Наталией. Обсуждение проекта по взаимодействию Яндекс станции с ДО",
            countOfMinutes: 150
          },
          {
            description: "Разработка http-сервиса в базе разработки ДО для организации API с навыком Яндекс станции.",
            countOfMinutes: 180
          }
        ]
      },
      {
        user: "Червоткин Кирилл Сергеевич",
        countOfMinutes: 300,
        stufftime: [
          {
            description: "Общение с Сергеем по задаче",
            countOfMinutes: 60
          },
          {
            description: "Доработка алгоритма. ( Сделана доработка обработки ошибок при отправки http запросов)",
            countOfMinutes: 120
          },
          {
            description: "Разворачивание на сервере (Упаковка в докер контейнер, запуск и настройка на стороне сервера)",
            countOfMinutes: 120
          }
        ]
      },
      {
        user: "Артемов Артем Владимирович",
        countOfMinutes: 480,
        stufftime: [
          {
            description: "Разработка Telegram-бота документооборота с интеграцией Gemini AI",
            countOfMinutes: 240
          },
          {
            description: "Настройка IoC контейнера и создание mock реализации API",
            countOfMinutes: 120
          },
          {
            description: "Интеграция с OpenRouter для доступа к Gemini 2.5 Flash Lite",
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
