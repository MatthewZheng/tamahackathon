// Sponsor abstraction stubs. Local-first; safe to import without credentials.

import type { CompanionInference, PetSignal } from "./types";

// -------------------- InsForge (future backend) --------------------
// Documented future adapter. In MVP everything stays in localStorage.
export const insforgeService = {
  configured: false,
  apiUrl: import.meta.env.VITE_INSFORGE_API_URL as string | undefined,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined,
  async syncCompanionState(_state: unknown) {
    return { ok: true, local: true };
  },
  async syncConversations(_msgs: unknown[]) {
    return { ok: true, local: true };
  },
  async syncConsent(_consent: unknown) {
    return { ok: true, local: true };
  },
};

// -------------------- Memory provider (Cognee / HydraDB future) -----
export type MemoryProvider = {
  name: "local" | "cognee" | "hydra";
  save(inferences: CompanionInference[]): Promise<void>;
  retrieveRelevant(query: string): Promise<CompanionInference[]>;
};

export const localMemoryProvider: MemoryProvider = {
  name: "local",
  async save() {
    /* storage handled by store */
  },
  async retrieveRelevant() {
    return [];
  },
};
// Future: cogneeMemoryProvider, hydraMemoryProvider

// -------------------- Pet signal service (BAND future) --------------
// Simulated pet-to-pet signal. Documents where BAND could later provide
// governed agent-to-agent communication.
export const petSignalService = {
  buildSignal(reason: "quiet_spark" | "return_after_absence"): PetSignal {
    const text =
      reason === "quiet_spark"
        ? "pocket has been a bit quiet."
        : "pocket is glad sam is back.";
    return {
      id: `sig_${Math.random().toString(36).slice(2, 8)}`,
      text,
      at: new Date().toISOString(),
      active: true,
    };
  },
  translateForFriend(_signal: PetSignal, sam = "sam") {
    // Friend only ever sees a minimal generic nudge — never private data.
    return `${sam}'s been a bit quiet. maybe say hi?`;
  },
};

// -------------------- Recommendation service ------------------------
export const recommendationService = {
  suggest(rec: string | null) {
    return rec;
  },
};

// -------------------- Response generator ----------------------------
// Wraps inference reply generation. A future LLM adapter would call
// through here with POCKET_SYSTEM_PROMPT.
export const responseGenerator = {
  greet() {
    return "hi. small check-in?";
  },
  farewellFromActivity() {
    return "the room got a little quieter.";
  },
};
