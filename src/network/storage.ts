type StoredValue<T> = {
  version: number;
  value: T;
};

const STORAGE_PREFIX = 'karachi-coup';

function storageAvailable(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[kind];
  } catch {
    return null;
  }
}

function readStoredValue<T>(storage: Storage | null, key: string): T | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredValue<T>;
    if (!parsed || parsed.version !== 1) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

function writeStoredValue<T>(storage: Storage | null, key: string, value: T): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify({ version: 1, value } satisfies StoredValue<T>));
  } catch {
    // Ignore storage failures in private mode / quota-limited environments.
  }
}

export function hostStorageKey(roomId: string): string {
  return `${STORAGE_PREFIX}:host:${roomId.toUpperCase()}`;
}

export function clientStorageKey(roomId: string): string {
  return `${STORAGE_PREFIX}:client:${roomId.toUpperCase()}`;
}

export function sessionStorageKey(): string {
  return `${STORAGE_PREFIX}:session`;
}

export function readLocalStorage<T>(key: string): T | null {
  return readStoredValue<T>(storageAvailable('localStorage'), key);
}

export function writeLocalStorage<T>(key: string, value: T): void {
  writeStoredValue(storageAvailable('localStorage'), key, value);
}

export function readSessionStorage<T>(key: string): T | null {
  return readStoredValue<T>(storageAvailable('sessionStorage'), key);
}

export function writeSessionStorage<T>(key: string, value: T): void {
  writeStoredValue(storageAvailable('sessionStorage'), key, value);
}

