import { STORAGE_KEY } from "./constants";
import { getLocalSlot } from "./localTransport";

// Two-window local testing (`?as=a` / `?as=b`) needs each tab to keep its own
// pet state — otherwise both tabs would read/write the same localStorage key.
function storageKey(): string {
  const slot = getLocalSlot();
  return slot ? `${STORAGE_KEY}.${slot}` : STORAGE_KEY;
}

export const storageService = {
  load<T>(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey());
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  save<T>(state: T) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey());
    } catch {
      /* ignore */
    }
  },
};
