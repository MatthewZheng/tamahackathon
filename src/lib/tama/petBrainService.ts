import { supabase, supabaseConfigured } from "./supabaseClient";
import type { ConversationMessage, InferenceCategory, Recommendation } from "./types";

export type BrainResult = {
  reply: string;
  options: string[];
  spriteState: "idle" | "perked" | "sleepy" | "low" | "celebrating";
  recommendation: Exclude<Recommendation, null> | "none";
  restDelta: number;
  bodyDelta: number;
  sparkDelta: number;
  needsSupport: boolean;
  crisisFlag: boolean;
  proposedInferences: { category: InferenceCategory; statement: string; confidence: "low" | "medium" | "high" }[];
};

const BRAIN_TIMEOUT_MS = 8000;

// The real Claude-backed pet brain. Never awaited by the UI thread for the
// instant reply — wellbeingInferenceService.infer() always answers first.
// This upgrades that reply in place if it resolves in time; on any failure
// (offline, cold function, timeout) it resolves null and the local reply stands.
export async function callPetBrain(input: {
  quickLabel?: string | null;
  freeText?: string | null;
  recentMessages: ConversationMessage[];
}): Promise<BrainResult | null> {
  if (!supabaseConfigured || !supabase) return null;

  const invokePromise = supabase.functions.invoke("pet-brain", {
    body: {
      quickLabel: input.quickLabel ?? null,
      freeText: input.freeText ?? null,
      recentMessages: input.recentMessages.slice(-6).map((m) => ({ from: m.from, text: m.text })),
    },
  });
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), BRAIN_TIMEOUT_MS));

  try {
    const outcome = await Promise.race([invokePromise, timeoutPromise]);
    if (!outcome) return null;
    const { data, error } = outcome;
    if (error || !data || typeof data !== "object" || "error" in data) return null;
    return data as BrainResult;
  } catch {
    return null;
  }
}
