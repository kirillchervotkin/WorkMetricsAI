import { IDocumentAPI, ILegacyDocumentAPI } from "../interfaces/IDocumentAPI";
import { MockDocumentAPI } from "../implementations/MockDocumentAPI";
import { MockDocumentAPINew } from "../implementations/MockDocumentAPINew";
import { RealDocumentAPI } from "../implementations/RealDocumentAPI";
import { HybridDocumentAPI } from "../implementations/HybridDocumentAPI";
type ServiceFactory<T> = () => T;
type ServiceInstance<T> = T;

export class DIContainer {
  private services = new Map<string, ServiceFactory<any> | ServiceInstance<any>>();
  private singletons = new Map<string, any>();
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): void {
    this.services.set(token, factory);
  }

  registerInstance<T>(token: string, instance: ServiceInstance<T>): void {
    this.services.set(token, instance);
    this.singletons.set(token, instance);
  }
  resolve<T>(token: string): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    const serviceOrFactory = this.services.get(token);

    if (!serviceOrFactory) {
      throw new Error(`Service with token "${token}" is not registered`);
    }

    if (typeof serviceOrFactory === 'function') {
      const instance = serviceOrFactory();
      this.singletons.set(token, instance);
      return instance;
    }

    return serviceOrFactory;
  }

  isRegistered(token: string): boolean {
    return this.services.has(token);
  }

  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  switchToMode(mode: 'mock' | 'real' | 'hybrid'): void {
    this.singletons.delete(SERVICE_TOKENS.DOCUMENT_API);
    this.singletons.delete(SERVICE_TOKENS.LEGACY_DOCUMENT_API);

    configureContainer(mode);

    console.log(`🔄 API переключен в режим: ${mode.toUpperCase()}`);
  }
}

export const SERVICE_TOKENS = {
  DOCUMENT_API: 'IDocumentAPI',
  LEGACY_DOCUMENT_API: 'ILegacyDocumentAPI'
} as const;

export const container = new DIContainer();
export class APIContainer {
  private currentMode: 'mock' | 'real' | 'hybrid' = 'hybrid';

  switchToMock(): void {
    this.currentMode = 'mock';
    container.switchToMode('mock');
  }

  switchToReal(): void {
    this.currentMode = 'real';
    container.switchToMode('real');
  }

  switchToHybrid(): void {
    this.currentMode = 'hybrid';
    container.switchToMode('hybrid');
  }

  getCurrentMode(): 'mock' | 'real' | 'hybrid' {
    return this.currentMode;
  }

  getAPI(): IDocumentAPI {
    return container.resolve<IDocumentAPI>(SERVICE_TOKENS.DOCUMENT_API);
  }
}

// Функция для настройки контейнера
export function configureContainer(
  mode: 'mock' | 'real' | 'hybrid' = 'hybrid'
): void {
  console.log(`🔧 Настройка IoC контейнера: ${mode.toUpperCase()} API`);

  // Регистрируем новый унифицированный API
  switch (mode) {
    case 'mock':
      container.registerSingleton<IDocumentAPI>(
        SERVICE_TOKENS.DOCUMENT_API,
        () => new MockDocumentAPINew()
      );
      break;
    case 'real':
      container.registerSingleton<IDocumentAPI>(
        SERVICE_TOKENS.DOCUMENT_API,
        () => new RealDocumentAPI()
      );
      break;
    case 'hybrid':
    default:
      container.registerSingleton<IDocumentAPI>(
        SERVICE_TOKENS.DOCUMENT_API,
        () => new HybridDocumentAPI()
      );
      break;
  }

  // Регистрируем старый API для совместимости с адаптером
  switch (mode) {
    case 'mock':
      container.registerSingleton<ILegacyDocumentAPI>(
        SERVICE_TOKENS.LEGACY_DOCUMENT_API,
        () => new MockDocumentAPI()
      );
      break;
    case 'real':
      // Для реального API используем Mock как fallback для legacy интерфейса
      container.registerSingleton<ILegacyDocumentAPI>(
        SERVICE_TOKENS.LEGACY_DOCUMENT_API,
        () => new MockDocumentAPI()
      );
      break;
    case 'hybrid':
    default:
      // Для гибридного режима используем Mock как fallback для старого API
      container.registerSingleton<ILegacyDocumentAPI>(
        SERVICE_TOKENS.LEGACY_DOCUMENT_API,
        () => new MockDocumentAPI()
      );
      break;
  }
}

// Автоматическая настройка при импорте
// Определяем режим работы из переменных окружения
function getAPIMode(): 'mock' | 'real' | 'hybrid' {
  if (process.env.USE_MOCK_API === 'true') {
    return 'mock';
  } else if (process.env.USE_REAL_API === 'true') {
    return 'real';
  } else {
    return 'hybrid'; // По умолчанию используем гибридный режим
  }
}

const apiMode = getAPIMode();
configureContainer(apiMode);

// Создаем экземпляр API контейнера
export const apiContainer = new APIContainer();

// Удобные функции для получения API
export function getDocumentAPI(): IDocumentAPI {
  return container.resolve<IDocumentAPI>(SERVICE_TOKENS.DOCUMENT_API);
}

export function getLegacyDocumentAPI(): ILegacyDocumentAPI {
  return container.resolve<ILegacyDocumentAPI>(SERVICE_TOKENS.LEGACY_DOCUMENT_API);
}
