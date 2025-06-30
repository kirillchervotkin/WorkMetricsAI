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
    { userName: "Иван Аналитик", userId: "0a77e3fa-6646-44hh-e155-e85417dde270" },
    { userName: "Петров Алексей Викторович", userId: "1b88f4fb-7757-55ii-f266-f96528ffe381" },
    { userName: "Сидорова Елена Михайловна", userId: "2c99g5gc-8868-66jj-g377-ga7639ggg492" },
    { userName: "Козлов Дмитрий Андреевич", userId: "3daa06hd-9979-77kk-h488-hb874ahha5a3" },
    { userName: "Новикова Анна Сергеевна", userId: "4ebb17ie-aa8a-88ll-i599-ic985biib6b4" },
    { userName: "Морозов Владимир Олегович", userId: "5fcc28jf-bb9b-99mm-j6aa-jda96cjjc7c5" },
    { userName: "Лебедева Ольга Николаевна", userId: "6gdd39kg-ccac-aann-k7bb-keb07dkkd8d6" },
    { userName: "Волков Максим Игоревич", userId: "7hee4alh-ddbd-bboo-l8cc-lfc18ellede7" },
    { userName: "Соколова Татьяна Павловна", userId: "8iff5bmi-eece-ccpp-m9dd-mgd29fmmfef8" },
    { userName: "Федоров Роман Александрович", userId: "9jgg6cnj-ffdf-ddqq-naee-nhe3agnngfg9" },
    { userName: "Кузнецова Светлана Валерьевна", userId: "ajhh7dok-ggeg-eerr-obff-oif4bhoohgh0" },
    { userName: "Попов Андрей Сергеевич", userId: "bkii8epl-hhfh-ffss-pcgg-pjg5cippihi1" },
    { userName: "Васильева Наталья Дмитриевна", userId: "cljj9fqm-iigi-ggtt-qdhh-qkh6djqqjij2" },
    { userName: "Смирнов Игорь Владимирович", userId: "dmkk0grn-jjhj-hhuu-reii-rlh7ekrrkjk3" },
    { userName: "Михайлова Юлия Андреевна", userId: "enll1hso-kkik-iivv-sfjj-smi8flsslkl4" },
    { userName: "Николаев Павел Михайлович", userId: "fomm2itp-lljl-jjww-tgkk-tnj9gmttmml5" },
    { userName: "Захарова Екатерина Олеговна", userId: "gpnn3juq-mmkm-kkxx-uhll-uok0hnuunnm6" },
    { userName: "Романов Сергей Николаевич", userId: "hqoo4kvr-nnln-llyy-vimm-vpl1iovvoon7" },
    { userName: "Григорьева Марина Викторовна", userId: "irpp5lws-oomm-mmzz-wjnn-wqm2jpwwppo8" },
    { userName: "Степанов Артур Дмитриевич", userId: "jsqq6mxt-ppnn-nnaa-xkoo-xrn3kqxxqqp9" },
    { userName: "Белова Алина Сергеевна", userId: "ktrr7nyu-qqoo-oobb-ylpp-yso4lryyrrqa" }
  ];

  private projects: IProject[] = [
    { name: "АйТи План - Подбор и развитие компетенций персонала", id: "745bb100-bedf-11ef-b92a-f86c91893b43" },
    { name: "Telegram Bot - Система документооборота", id: "856cc211-cfea-22fa-c93b-a97d94bba554" },
    { name: "АСКОНА ТД - Исправление характеристик в документах", id: "967dd322-daeb-33ab-da4c-ba8e05ccb665" },
    { name: "Развитие программистов - Освоение новых технологий", id: "a78ee433-ebfc-44bc-eb5d-cb9f16ddc776" },
    { name: "ГЕРОФАРМ - Автоматизация складских процессов", id: "b89ff544-fcad-55cd-fc6e-dc0a27eed887" },
    { name: "МОСТОТРЕСТ - Система управления проектами", id: "c9a006655-adbe-66de-ad7f-ed1b38ffe998" },
    { name: "Банк ВТБ - Модернизация платежной системы", id: "da1117766-becf-77ef-be80-fe2c49aafaa9" },
    { name: "Сбербанк - Разработка мобильного приложения", id: "eb2228877-cfda-88fa-cf91-af3d5abbabba" },
    { name: "Газпром - Цифровизация документооборота", id: "fc3339988-dae0-99ab-da02-ba4e6bccbccb" },
    { name: "Роснефть - Система мониторинга оборудования", id: "ad4440099-ebf1-aabb-eb13-cb5f7cddcddc" },
    { name: "РЖД - Автоматизация логистики", id: "be555100a-fca2-bbcc-fc24-dc6a8deedeed" },
    { name: "Ростелеком - Облачная инфраструктура", id: "cf666211b-adb3-ccdd-ad35-ed7b9efffefe" },
    { name: "Яндекс - Система аналитики данных", id: "da777322c-bec4-ddee-be46-fe8c0faaaaff" },
    { name: "Mail.ru - Социальная платформа", id: "eb888433d-cfd5-eeff-cf57-af9d1abbbba0" },
    { name: "Тинькофф - Финтех решения", id: "fc999544e-dae6-ffaa-da68-ba0e2bcccccb1" }
  ];

  private workTypes: IWorkType[] = [
    { name: "Административные работы", id: "457a0f87-5250-11ea-a99d-005056905560" },
    { name: "Анализ/Обследование", id: "7f030f0a-524c-11ea-a99d-005056905560" },
    { name: "Встреча", id: "a35f1699-642a-11ea-a9a1-005056905560" },
    { name: "Разработка", id: "b46f2700-753b-22eb-ba02-006067906671" },
    { name: "Тестирование", id: "c57f3811-864c-33fc-cb13-117178a17782" },
    { name: "Документирование", id: "d68f4922-975d-44ad-dc24-228289b28893" },
    { name: "Проектирование", id: "e79a5033-086e-55be-e135-339390c39904" },
    { name: "Код-ревью", id: "f80b6144-197f-66cf-f246-44a4a1d4aa15" },
    { name: "Обучение", id: "a91c7255-2a80-77da-a357-55b5b2e5bb26" },
    { name: "Консультации", id: "ba2d8366-3b91-88eb-b468-66c6c3f6cc37" },
    { name: "Исследование", id: "cb3e9477-4ca2-99fc-c579-77d7d4a7dd48" },
    { name: "Планирование", id: "dc4fa588-5db3-aaad-d68a-88e8e5b8ee59" },
    { name: "Внедрение", id: "ed5ab699-6ec4-bbbe-e79b-99f9f6c9ff6a" },
    { name: "Поддержка", id: "fe6bc7aa-7fd5-cccf-f8ac-aa0a07daaa7b" },
    { name: "Оптимизация", id: "af7cd8bb-80e6-ddda-a9bd-bb1b18ebbb8c" },
    { name: "Интеграция", id: "ba8de9cc-91f7-eeeb-bace-cc2c29fccc9d" },
    { name: "Миграция", id: "cb9efadd-a2a8-fffc-cbdf-dd3d3aadddae" },
    { name: "Мониторинг", id: "dca0abee-b3b9-aaad-dcea-ee4e4bbeeeef" },
    { name: "Отчетность", id: "edb1bcff-c4ca-bbbb-edfb-ff5f5ccffffa" }
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
    },
    {
      name: "ГЕРОФАРМ - Разработка модуля инвентаризации",
      id: "1c25f6aa-0dd0-44bb-cc5c-g7e965gag6g6",
      deadline: "20250820235959"
    },
    {
      name: "МОСТОТРЕСТ - Создание системы отчетности",
      id: "2d36a7bb-1ee1-55cc-dd6d-h8fa76hbh7h7",
      deadline: "20250815235959"
    },
    {
      name: "Банк ВТБ - Тестирование платежных операций",
      id: "3e47b8cc-2ff2-66dd-ee7e-i9ab87ici8i8",
      deadline: "20250810235959"
    },
    {
      name: "Сбербанк - Оптимизация мобильного интерфейса",
      id: "4f58c9dd-3aa3-77ee-ff8f-j0bc98jdj9j9",
      deadline: "20250805235959"
    },
    {
      name: "Газпром - Внедрение электронного документооборота",
      id: "5a69daee-4bb4-88ff-aa9a-k1cd09kek0k0",
      deadline: "20250825235959"
    },
    {
      name: "Роснефть - Настройка системы мониторинга",
      id: "6b70ebff-5cc5-99aa-bb0b-l2de10lfl1l1",
      deadline: "20250830235959"
    },
    {
      name: "РЖД - Автоматизация складского учета",
      id: "7c81fcaa-6dd6-aabb-cc1c-m3ef21mgm2m2",
      deadline: "20250822235959"
    },
    {
      name: "Ростелеком - Миграция в облако",
      id: "8d92adbb-7ee7-bbcc-dd2d-n4fa32nhn3n3",
      deadline: "20250818235959"
    },
    {
      name: "Яндекс - Анализ пользовательских данных",
      id: "9ea3becc-8ff8-ccdd-ee3e-o5ab43oio4o4",
      deadline: "20250812235959"
    },
    {
      name: "Mail.ru - Разработка чат-функций",
      id: "0fb4cfdd-9aa9-ddee-ff4f-p6bc54pjp5p5",
      deadline: "20250808235959"
    },
    {
      name: "Тинькофф - Интеграция с внешними API",
      id: "1ac5daee-0bb0-eeff-aa5a-q7cd65qkq6q6",
      deadline: "20250828235959"
    },
    {
      name: "АйТи План - Код-ревью новых модулей",
      id: "2bd6ebff-1cc1-ffaa-bb6b-r8de76rlr7r7",
      deadline: "20250724235959"
    },
    {
      name: "АСКОНА ТД - Обновление документации API",
      id: "3ce7fcaa-2dd2-aabb-cc7c-s9ef87sms8s8",
      deadline: "20250720235959"
    },
    {
      name: "Telegram Bot - Создание системы уведомлений",
      id: "4df8adbb-3ee3-bbcc-dd8d-t0fa98tnt9t9",
      deadline: "20250716235959"
    },
    {
      name: "ГЕРОФАРМ - Тестирование складской системы",
      id: "5ea9becc-4ff4-ccdd-ee9e-u1ab09uou0u0",
      deadline: "20250826235959"
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
      },
      {
        user: "Петров Алексей Викторович",
        countOfMinutes: 450,
        stufftime: [
          {
            description: "ГЕРОФАРМ - Разработка модуля инвентаризации",
            countOfMinutes: 240
          },
          {
            description: "Код-ревью и оптимизация алгоритмов",
            countOfMinutes: 120
          },
          {
            description: "Встреча с заказчиком по техническим требованиям",
            countOfMinutes: 90
          }
        ]
      },
      {
        user: "Сидорова Елена Михайловна",
        countOfMinutes: 380,
        stufftime: [
          {
            description: "МОСТОТРЕСТ - Создание системы отчетности",
            countOfMinutes: 180
          },
          {
            description: "Тестирование интеграционных модулей",
            countOfMinutes: 120
          },
          {
            description: "Документирование процессов тестирования",
            countOfMinutes: 80
          }
        ]
      },
      {
        user: "Козлов Дмитрий Андреевич",
        countOfMinutes: 520,
        stufftime: [
          {
            description: "Банк ВТБ - Тестирование платежных операций",
            countOfMinutes: 300
          },
          {
            description: "Анализ безопасности финансовых транзакций",
            countOfMinutes: 150
          },
          {
            description: "Подготовка отчета по нагрузочному тестированию",
            countOfMinutes: 70
          }
        ]
      },
      {
        user: "Новикова Анна Сергеевна",
        countOfMinutes: 410,
        stufftime: [
          {
            description: "Сбербанк - Оптимизация мобильного интерфейса",
            countOfMinutes: 210
          },
          {
            description: "UX/UI исследование пользовательского опыта",
            countOfMinutes: 120
          },
          {
            description: "Создание прототипов новых экранов",
            countOfMinutes: 80
          }
        ]
      },
      {
        user: "Морозов Владимир Олегович",
        countOfMinutes: 480,
        stufftime: [
          {
            description: "Газпром - Внедрение электронного документооборота",
            countOfMinutes: 240
          },
          {
            description: "Настройка серверной инфраструктуры",
            countOfMinutes: 150
          },
          {
            description: "Миграция данных из старой системы",
            countOfMinutes: 90
          }
        ]
      },
      {
        user: "Лебедева Ольга Николаевна",
        countOfMinutes: 360,
        stufftime: [
          {
            description: "Роснефть - Настройка системы мониторинга",
            countOfMinutes: 180
          },
          {
            description: "Создание дашбордов для аналитики",
            countOfMinutes: 120
          },
          {
            description: "Обучение пользователей новой системе",
            countOfMinutes: 60
          }
        ]
      },
      {
        user: "Волков Максим Игоревич",
        countOfMinutes: 440,
        stufftime: [
          {
            description: "РЖД - Автоматизация складского учета",
            countOfMinutes: 220
          },
          {
            description: "Интеграция с внешними логистическими системами",
            countOfMinutes: 140
          },
          {
            description: "Оптимизация алгоритмов поиска товаров",
            countOfMinutes: 80
          }
        ]
      },
      {
        user: "Соколова Татьяна Павловна",
        countOfMinutes: 390,
        stufftime: [
          {
            description: "Ростелеком - Миграция в облако",
            countOfMinutes: 200
          },
          {
            description: "Настройка облачной инфраструктуры AWS",
            countOfMinutes: 120
          },
          {
            description: "Тестирование производительности в облаке",
            countOfMinutes: 70
          }
        ]
      },
      {
        user: "Федоров Роман Александрович",
        countOfMinutes: 470,
        stufftime: [
          {
            description: "Яндекс - Анализ пользовательских данных",
            countOfMinutes: 250
          },
          {
            description: "Создание ML-моделей для рекомендаций",
            countOfMinutes: 150
          },
          {
            description: "Оптимизация запросов к базе данных",
            countOfMinutes: 70
          }
        ]
      },
      {
        user: "Кузнецова Светлана Валерьевна",
        countOfMinutes: 350,
        stufftime: [
          {
            description: "Mail.ru - Разработка чат-функций",
            countOfMinutes: 180
          },
          {
            description: "Интеграция с системами уведомлений",
            countOfMinutes: 110
          },
          {
            description: "Тестирование real-time функциональности",
            countOfMinutes: 60
          }
        ]
      },
      {
        user: "Попов Андрей Сергеевич",
        countOfMinutes: 420,
        stufftime: [
          {
            description: "Тинькофф - Интеграция с внешними API",
            countOfMinutes: 210
          },
          {
            description: "Разработка финтех микросервисов",
            countOfMinutes: 140
          },
          {
            description: "Код-ревью и рефакторинг legacy кода",
            countOfMinutes: 70
          }
        ]
      },
      {
        user: "Васильева Наталья Дмитриевна",
        countOfMinutes: 380,
        stufftime: [
          {
            description: "АйТи План - Код-ревью новых модулей",
            countOfMinutes: 180
          },
          {
            description: "Менторинг junior разработчиков",
            countOfMinutes: 120
          },
          {
            description: "Планирование архитектуры новых фич",
            countOfMinutes: 80
          }
        ]
      },
      {
        user: "Смирнов Игорь Владимирович",
        countOfMinutes: 460,
        stufftime: [
          {
            description: "АСКОНА ТД - Обновление документации API",
            countOfMinutes: 200
          },
          {
            description: "Создание автотестов для API endpoints",
            countOfMinutes: 160
          },
          {
            description: "Исследование новых технологий тестирования",
            countOfMinutes: 100
          }
        ]
      },
      {
        user: "Михайлова Юлия Андреевна",
        countOfMinutes: 340,
        stufftime: [
          {
            description: "Telegram Bot - Создание системы уведомлений",
            countOfMinutes: 160
          },
          {
            description: "Дизайн пользовательского интерфейса бота",
            countOfMinutes: 120
          },
          {
            description: "A/B тестирование новых функций",
            countOfMinutes: 60
          }
        ]
      },
      {
        user: "Николаев Павел Михайлович",
        countOfMinutes: 490,
        stufftime: [
          {
            description: "ГЕРОФАРМ - Тестирование складской системы",
            countOfMinutes: 240
          },
          {
            description: "Автоматизация процессов CI/CD",
            countOfMinutes: 150
          },
          {
            description: "Настройка мониторинга производительности",
            countOfMinutes: 100
          }
        ]
      },
      {
        user: "Захарова Екатерина Олеговна",
        countOfMinutes: 320,
        stufftime: [
          {
            description: "Административные работы и планирование",
            countOfMinutes: 120
          },
          {
            description: "Координация работы команды разработки",
            countOfMinutes: 100
          },
          {
            description: "Подготовка технических презентаций",
            countOfMinutes: 100
          }
        ]
      },
      {
        user: "Романов Сергей Николаевич",
        countOfMinutes: 450,
        stufftime: [
          {
            description: "DevOps - Настройка серверной инфраструктуры",
            countOfMinutes: 200
          },
          {
            description: "Автоматизация развертывания приложений",
            countOfMinutes: 150
          },
          {
            description: "Мониторинг и логирование системы",
            countOfMinutes: 100
          }
        ]
      },
      {
        user: "Григорьева Марина Викторовна",
        countOfMinutes: 370,
        stufftime: [
          {
            description: "Анализ требований к новым проектам",
            countOfMinutes: 150
          },
          {
            description: "Создание технических спецификаций",
            countOfMinutes: 120
          },
          {
            description: "Консультации с заказчиками",
            countOfMinutes: 100
          }
        ]
      },
      {
        user: "Степанов Артур Дмитриевич",
        countOfMinutes: 410,
        stufftime: [
          {
            description: "Разработка микросервисной архитектуры",
            countOfMinutes: 180
          },
          {
            description: "Оптимизация производительности баз данных",
            countOfMinutes: 130
          },
          {
            description: "Исследование новых фреймворков",
            countOfMinutes: 100
          }
        ]
      },
      {
        user: "Белова Алина Сергеевна",
        countOfMinutes: 330,
        stufftime: [
          {
            description: "Frontend разработка пользовательских интерфейсов",
            countOfMinutes: 150
          },
          {
            description: "Создание адаптивных веб-компонентов",
            countOfMinutes: 120
          },
          {
            description: "Тестирование кроссбраузерной совместимости",
            countOfMinutes: 60
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
