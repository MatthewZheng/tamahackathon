// Client-side wrapper around Hydra server functions. Silent-degrades to local.
import type { CompanionInference } from "./types";
import type { MemoryProvider } from "./services";
import {
  hydraStatus,
  hydraSaveFn,
  hydraRetrieveFn,
  hydraForgetFn,
  hydraRelationsFn,
  type RelationEdge,
} from "./hydra.functions";

const DEVICE_KEY = "tama_hydra_device_id";
const SYNCED_KEY = "tama_hydra_synced_ids";

function deviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      "dev_" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36).slice(-4);
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function hydraCollectionFor(userId: string | null): string {
  // Collections must be short & filesystem-safe.
  const raw = (userId ?? deviceId()).replace(/[^a-zA-Z0-9_-]/g, "");
  return `tama_${raw}`.slice(0, 80);
}

function loadSynced(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SYNCED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveSynced(set: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNCED_KEY, JSON.stringify([...set]));
}

let _configured: boolean | null = null;
export async function isHydraConfigured(): Promise<boolean> {
  if (_configured !== null) return _configured;
  try {
    const r = await hydraStatus();
    _configured = !!r.configured;
  } catch {
    _configured = false;
  }
  return _configured;
}

export function makeHydraProvider(userId: string | null): MemoryProvider & {
  forgetAll: () => Promise<void>;
  getRelations: () => Promise<RelationEdge[]>;
} {
  const collection = hydraCollectionFor(userId);

  return {
    name: "hydra",
    async save(inferences: CompanionInference[]) {
      if (!(await isHydraConfigured())) return;
      const synced = loadSynced();
      const fresh = inferences.filter(
        (m) => m.isActive && m.userConfirmed && !synced.has(m.id),
      );
      if (!fresh.length) return;
      const res = await hydraSaveFn({
        data: {
          collection,
          items: fresh.map((m) => ({
            text: m.statement,
            category: String(m.category),
            confidence: m.confidence,
            inferenceId: m.id,
          })),
        },
      });
      if (res.ok) {
        for (const m of fresh) synced.add(m.id);
        saveSynced(synced);
      }
    },
    async retrieveRelevant(query: string) {
      if (!(await isHydraConfigured()) || !query.trim()) return [];
      const res = await hydraRetrieveFn({
        data: { collection, query, maxResults: 6 },
      });
      if (!res.ok) return [];
      // Shape as thin CompanionInference-lookalikes for the reply service.
      const now = new Date().toISOString();
      return res.chunks.map((c) => ({
        id: c.id,
        category: "preference" as const,
        statement: c.text,
        sourceText: "",
        sourceDate: now,
        confidence: "medium" as const,
        userConfirmed: true,
        userCorrected: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }));
    },
    async forgetAll() {
      saveSynced(new Set());
      if (!(await isHydraConfigured())) return;
      await hydraForgetFn({ data: { collection } });
    },
    async getRelations() {
      if (!(await isHydraConfigured())) return [];
      const res = await hydraRelationsFn({ data: { collection } });
      return res.ok ? res.edges : [];
    },
  };
}
