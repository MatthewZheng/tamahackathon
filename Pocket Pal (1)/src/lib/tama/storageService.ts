import { STORAGE_KEY } from "./constants";

export const storageService = {
  load<T>(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  save<T>(state: T) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
