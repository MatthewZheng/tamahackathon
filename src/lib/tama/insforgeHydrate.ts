// Fetch server-side state and merge into local. Called on sign-in.
import type { CompanionInference, PositiveMemory } from "./types";
import { insforge } from "./insforgeClient";

export type HydrateResult = {
  profile?: { userName: string; petName: string; spriteTint: string; spriteSpecies?: string; shellTheme?: string; overlayShape?: string; overlaySize?: string; bond?: number; evolutionStage?: 1 | 2 | 3 };
  wellbeing?: { rest: number; body: number; spark: number };
  consent?: {
    memoryEnabled: boolean;
    petSignalsEnabled: boolean;
    proactiveEnabled: boolean;
    soundEnabled: boolean;
    reducedMotion: boolean;
  };
  memory?: CompanionInference[];
  positive?: PositiveMemory[];
};

export async function hydrateFromServer(userId: string): Promise<HydrateResult> {
  const c = insforge();
  if (!c) return {};
  const out: HydrateResult = {};

  const [profile, wb, consent, mem, pos] = await Promise.all([
    c.database.from("tama_profiles").select().eq("user_id", userId).limit(1),
    c.database.from("tama_wellbeing").select().eq("user_id", userId).limit(1),
    c.database.from("tama_consent").select().eq("user_id", userId).limit(1),
    c.database.from("tama_memory").select().eq("user_id", userId),
    c.database.from("tama_positive_memories").select().eq("user_id", userId),
  ]);

  const p = (profile.data as Array<{ user_name: string; pet_name: string; sprite_tint: string; sprite_species?: string; shell_theme?: string; overlay_shape?: string; overlay_size?: string; bond?: number; evolution_stage?: number }> | null)?.[0];
  if (p) out.profile = {
    userName: p.user_name,
    petName: p.pet_name,
    spriteTint: p.sprite_tint,
    spriteSpecies: p.sprite_species,
    shellTheme: p.shell_theme,
    overlayShape: p.overlay_shape,
    overlaySize: p.overlay_size,
    bond: p.bond,
    evolutionStage: (p.evolution_stage as 1 | 2 | 3 | undefined),
  };

  const w = (wb.data as Array<{ rest: number; body: number; spark: number }> | null)?.[0];
  if (w) out.wellbeing = { rest: w.rest, body: w.body, spark: w.spark };

  const cn = (consent.data as Array<{
    memory_enabled: boolean;
    pet_signals_enabled: boolean;
    proactive_enabled: boolean;
    sound_enabled: boolean;
    reduced_motion: boolean;
  }> | null)?.[0];
  if (cn) out.consent = {
    memoryEnabled: cn.memory_enabled,
    petSignalsEnabled: cn.pet_signals_enabled,
    proactiveEnabled: cn.proactive_enabled,
    soundEnabled: cn.sound_enabled,
    reducedMotion: cn.reduced_motion,
  };

  const memRows = (mem.data as Array<{
    inference_id: string; category: string; statement: string; source_text: string;
    source_date: string; confidence: string; user_confirmed: boolean; user_corrected: boolean;
    is_active: boolean; created_at: string; updated_at: string;
  }> | null) ?? [];
  out.memory = memRows.map((r) => ({
    id: r.inference_id,
    category: r.category as CompanionInference["category"],
    statement: r.statement,
    sourceText: r.source_text,
    sourceDate: r.source_date,
    confidence: r.confidence as CompanionInference["confidence"],
    userConfirmed: r.user_confirmed,
    userCorrected: r.user_corrected,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const posRows = (pos.data as Array<{ memory_id: string; kind: string; note: string; at: string }> | null) ?? [];
  out.positive = posRows.map((r) => ({ id: r.memory_id, kind: r.kind, note: r.note, at: r.at }));

  return out;
}
