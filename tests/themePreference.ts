import {
  applyPreferredTheme,
  getEffectiveThemePreference,
  readStoredThemePreference,
  setThemePreference,
  toggleThemePreference,
} from '../src/dom/themePreference.ts';
import type { StorageLike } from '../src/persistence/storage.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('storage read failed');
  }

  setItem(): void {
    throw new Error('storage write failed');
  }

  removeItem(): void {
    throw new Error('storage remove failed');
  }
}

const createDocumentElement = () => ({
  dataset: {} as Record<string, string>,
  style: {} as Record<string, string>,
});

const installDom = (prefersLight = false): { documentElement: ReturnType<typeof createDocumentElement>; events: string[] } => {
  const documentElement = createDocumentElement();
  const events: string[] = [];
  Object.defineProperty(globalThis, 'document', {
    value: { documentElement },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      matchMedia: () => ({ matches: prefersLight }),
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'CustomEvent', {
    value: class TestCustomEvent<T> extends Event {
      detail: T;

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type);
        this.detail = init?.detail as T;
      }
    },
    configurable: true,
  });

  return { documentElement, events };
};

const runStoredPreferenceScenario = (): void => {
  const storage = new MemoryStorage();
  const { documentElement, events } = installDom();

  assert(readStoredThemePreference(storage) === null, 'expected no stored theme initially');
  assert(getEffectiveThemePreference(storage) === 'dark', 'expected dark system fallback');

  setThemePreference('light', storage);
  assert(readStoredThemePreference(storage) === 'light', 'expected light theme to persist');
  assert(documentElement.dataset.theme === 'light', 'expected light theme attribute');
  assert(documentElement.style.colorScheme === 'light', 'expected light color scheme');
  assert(events.includes('soft-focus:themechange'), 'expected theme change event');

  toggleThemePreference(storage);
  assert(readStoredThemePreference(storage) === 'dark', 'expected toggle to persist dark theme');
  assert(String(documentElement.dataset.theme) === 'dark', 'expected dark theme attribute');
};

const runInvalidAndStorageFailureScenario = (): void => {
  const storage = new MemoryStorage();
  installDom(true);
  storage.setItem('soft-focus/theme-preference', 'solarized');
  assert(readStoredThemePreference(storage) === null, 'expected invalid stored theme to be ignored');
  assert(applyPreferredTheme(storage) === 'light', 'expected system light fallback');

  const { documentElement } = installDom(false);
  assert(setThemePreference('dark', new ThrowingStorage()) === 'dark', 'expected theme set to survive persistence failure');
  assert(documentElement.dataset.theme === 'dark', 'expected DOM theme update despite storage failure');
};

runStoredPreferenceScenario();
runInvalidAndStorageFailureScenario();

console.log('theme preference validation passed');
