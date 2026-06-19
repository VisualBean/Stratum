import { DashboardConfig, DEFAULT_CONFIG, normalizeConfig } from "./config";

const STORAGE_KEY = "simple-startpage-config";

type BrowserLike = {
  storage?: {
    local?: {
      get: (key: string, callback?: (items: Record<string, unknown>) => void) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>, callback?: () => void) => Promise<void> | void;
    };
  };
};

export async function loadConfig(): Promise<DashboardConfig> {
  try {
    const stored = await storageGet(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CONFIG;
    }

    return normalizeConfig(stored);
  } catch (error) {
    console.warn("Failed to load stored config. Falling back to defaults.", error);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: DashboardConfig) {
  await storageSet(STORAGE_KEY, config);
}

async function storageGet(key: string): Promise<unknown> {
  const browserApi = extensionApi("browser");
  if (browserApi?.storage?.local) {
    const result = await browserApi.storage.local.get(key);
    return result[key];
  }

  const chromeApi = extensionApi("chrome");
  if (chromeApi?.storage?.local) {
    return await new Promise((resolve) => {
      chromeApi.storage?.local?.get(key, (items) => resolve(items[key]));
    });
  }

  const raw = globalThis.localStorage?.getItem(key);
  return raw ? JSON.parse(raw) : undefined;
}

async function storageSet(key: string, value: unknown): Promise<void> {
  const browserApi = extensionApi("browser");
  if (browserApi?.storage?.local) {
    await browserApi.storage.local.set({ [key]: value });
    return;
  }

  const chromeApi = extensionApi("chrome");
  if (chromeApi?.storage?.local) {
    await new Promise<void>((resolve) => {
      chromeApi.storage?.local?.set({ [key]: value }, resolve);
    });
    return;
  }

  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

function extensionApi(name: "browser" | "chrome") {
  return (globalThis as unknown as Record<string, BrowserLike | undefined>)[name];
}
