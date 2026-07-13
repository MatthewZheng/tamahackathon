import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

const PROFILE_KEY = "tama.profileId";

export function getProfileId(): string {
  if (typeof window === "undefined") return "sam";
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("user");
  if (fromQuery) {
    window.localStorage.setItem(PROFILE_KEY, fromQuery);
    return fromQuery;
  }
  return window.localStorage.getItem(PROFILE_KEY) ?? "sam";
}

export function friendProfileId(profileId: string): string {
  return profileId === "sam" ? "jamie" : "sam";
}
