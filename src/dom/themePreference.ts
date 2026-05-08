import { getBrowserStorage, readStorageItem, type StorageLike, writeStorageItem } from '../persistence/storage';

export type ThemePreference = 'light' | 'dark';

const themeStorageKey = 'soft-focus/theme-preference';

const isThemePreference = (value: string | null): value is ThemePreference => value === 'light' || value === 'dark';

const getSystemTheme = (): ThemePreference => {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
};

const applyThemeAttributes = (theme: ThemePreference): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export const readStoredThemePreference = (storage: StorageLike | null = getBrowserStorage()): ThemePreference | null => {
  const value = readStorageItem(storage, themeStorageKey);

  return isThemePreference(value) ? value : null;
};

export const getEffectiveThemePreference = (storage: StorageLike | null = getBrowserStorage()): ThemePreference => (
  readStoredThemePreference(storage) ?? getSystemTheme()
);

export const applyPreferredTheme = (storage: StorageLike | null = getBrowserStorage()): ThemePreference => {
  const theme = getEffectiveThemePreference(storage);
  applyThemeAttributes(theme);
  return theme;
};

export const setThemePreference = (theme: ThemePreference, storage: StorageLike | null = getBrowserStorage()): ThemePreference => {
  writeStorageItem(storage, themeStorageKey, theme);
  applyThemeAttributes(theme);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ThemePreference>('soft-focus:themechange', { detail: theme }));
  }
  return theme;
};

export const toggleThemePreference = (storage: StorageLike | null = getBrowserStorage()): ThemePreference => {
  const nextTheme: ThemePreference = getEffectiveThemePreference(storage) === 'dark' ? 'light' : 'dark';

  return setThemePreference(nextTheme, storage);
};
