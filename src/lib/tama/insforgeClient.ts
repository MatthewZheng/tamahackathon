import { createClient } from "@insforge/sdk";
import { INSFORGE_ANON_KEY, INSFORGE_URL, isInsforgeConfigured } from "./insforgeConfig";

type Client = ReturnType<typeof createClient>;

let _client: Client | null = null;

export function insforge(): Client | null {
  if (!isInsforgeConfigured()) return null;
  if (_client) return _client;
  _client = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
  });
  return _client;
}
