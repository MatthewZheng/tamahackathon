// Thin wrapper around InsForge auth. All calls no-op safely when unconfigured.
import { insforge } from "./insforgeClient";

export type InsforgeUser = {
  id: string;
  email: string;
  name?: string;
};

export async function getCurrentUser(): Promise<InsforgeUser | null> {
  const c = insforge();
  if (!c) return null;
  try {
    const { data } = await c.auth.getCurrentUser();
    const u = (data as { user?: InsforgeUser } | null)?.user;
    return u ?? null;
  } catch {
    return null;
  }
}

export async function signUpEmail(email: string, password: string, name?: string) {
  const c = insforge();
  if (!c) return { error: { message: "sync is off (insforge not configured)" } };
  return c.auth.signUp({ email, password, name });
}

export async function signInEmail(email: string, password: string) {
  const c = insforge();
  if (!c) return { error: { message: "sync is off (insforge not configured)" } };
  return c.auth.signInWithPassword({ email, password });
}

export async function signInGoogle() {
  const c = insforge();
  if (!c) return { error: { message: "sync is off" } };
  return c.auth.signInWithOAuth("google", {
    redirectTo: typeof window !== "undefined" ? window.location.origin : "",
  });
}

export async function signOut() {
  const c = insforge();
  if (!c) return { error: null };
  return c.auth.signOut();
}
