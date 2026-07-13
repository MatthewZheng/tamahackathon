// Inline InsForge publishable config. Paste values from your InsForge project.
// Publishable/anon keys are safe to inline (RLS enforces access server-side).
// Leave both empty to keep the app fully local-first (all InsForge calls no-op).

export const INSFORGE_URL =
  (import.meta.env.VITE_INSFORGE_URL as string | undefined) ??
  "https://bq9s6v5n.us-west.insforge.app";
export const INSFORGE_ANON_KEY =
  (import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined) ??
  "anon_effbe31eeb25fffadb5277bd35688a03b4114fda89fa4cecec753d03228f2ef4";

export const isInsforgeConfigured = () =>
  Boolean(INSFORGE_URL && INSFORGE_ANON_KEY);
