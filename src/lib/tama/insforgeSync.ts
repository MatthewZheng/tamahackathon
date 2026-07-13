// Debounced additive sync: local is source of truth, server mirrors it.
// Privacy: memory inferences are only synced when consent.memoryEnabled === true.
// If memory is toggled off, previously synced inferences are deleted server-side.

import type { TamaState } from "./store";
import { insforge } from "./insforgeClient";

type Slice = "profile" | "wellbeing" | "consent" | "conversation" | "memory" | "positive" | "signals";

const DEBOUNCE_MS = 800;
const timers: Partial<Record<Slice, ReturnType<typeof setTimeout>>> = {};

function schedule(slice: Slice, fn: () => Promise<void>) {
  if (timers[slice]) clearTimeout(timers[slice]);
  timers[slice] = setTimeout(() => {
    void fn().catch((e) => console.warn(`[insforge sync ${slice}]`, e));
  }, DEBOUNCE_MS);
}

async function currentUserId(): Promise<string | null> {
  const c = insforge();
  if (!c) return null;
  try {
    const { data } = await c.auth.getCurrentUser();
    return (data as { user?: { id: string } } | null)?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function syncProfile(state: TamaState) {
  schedule("profile", async () => {
    const c = insforge();
    const uid = await currentUserId();
    if (!c || !uid) return;
    await c.database
      .from("tama_profiles")
      .upsert({
        user_id: uid,
        user_name: state.userName,
        pet_name: state.petName,
        sprite_tint: state.spriteTint,
        sprite_species: state.spriteSpecies,
        shell_theme: state.shellTheme,
        overlay_shape: state.overlayShape,
        overlay_size: state.overlaySize,
        bond: state.bond,
        evolution_stage: state.evolutionStage,
      })
      .select();
  });
}

export function syncWellbeing(state: TamaState) {
  schedule("wellbeing", async () => {
    const c = insforge();
    const uid = await currentUserId();
    if (!c || !uid) return;
    await c.database
      .from("tama_wellbeing")
      .upsert({
        user_id: uid,
        rest: state.wellbeing.rest,
        body: state.wellbeing.body,
        spark: state.wellbeing.spark,
        sprite_state: state.spriteState,
        updated_at: new Date().toISOString(),
      })
      .select();
  });
}

export function syncConsent(state: TamaState) {
  schedule("consent", async () => {
    const c = insforge();
    const uid = await currentUserId();
    if (!c || !uid) return;
    await c.database
      .from("tama_consent")
      .upsert({
        user_id: uid,
        memory_enabled: state.consent.memoryEnabled,
        pet_signals_enabled: state.consent.petSignalsEnabled,
        proactive_enabled: state.consent.proactiveEnabled,
        sound_enabled: state.consent.soundEnabled,
        reduced_motion: state.consent.reducedMotion,
      })
      .select();

    // If memory turned off, wipe server-side inferences.
    if (!state.consent.memoryEnabled) {
      await c.database.from("tama_memory").delete().eq("user_id", uid).select();
    }
  });
}

export function syncMemory(state: TamaState) {
  schedule("memory", async () => {
    const c = insforge();
    const uid = await currentUserId();
    if (!c || !uid) return;
    // Consent enforcement: never sync memory when disabled.
    if (!state.consent.memoryEnabled) {
      await c.database.from("tama_memory").delete().eq("user_id", uid).select();
      return;
    }
    // Naive additive mirror: replace all rows for this user.
    await c.database.from("tama_memory").delete().eq("user_id", uid).select();
    const rows = state.memory.map((m) => ({
      user_id: uid,
      inference_id: m.id,
      category: m.category,
      statement: m.statement,
      source_text: m.sourceText,
      source_date: m.sourceDate,
      confidence: m.confidence,
      user_confirmed: m.userConfirmed,
      user_corrected: m.userCorrected,
      is_active: m.isActive,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    }));
    if (rows.length) await c.database.from("tama_memory").insert(rows).select();
  });
}

export function syncPositive(state: TamaState) {
  schedule("positive", async () => {
    const c = insforge();
    const uid = await currentUserId();
    if (!c || !uid) return;
    await c.database.from("tama_positive_memories").delete().eq("user_id", uid).select();
    const rows = state.positiveMemories.map((p) => ({
      user_id: uid,
      memory_id: p.id,
      kind: p.kind,
      note: p.note,
      at: p.at,
    }));
    if (rows.length) await c.database.from("tama_positive_memories").insert(rows).select();
  });
}

export async function deleteAllServerData() {
  const c = insforge();
  const uid = await currentUserId();
  if (!c || !uid) return;
  await Promise.all([
    c.database.from("tama_profiles").delete().eq("user_id", uid).select(),
    c.database.from("tama_wellbeing").delete().eq("user_id", uid).select(),
    c.database.from("tama_consent").delete().eq("user_id", uid).select(),
    c.database.from("tama_memory").delete().eq("user_id", uid).select(),
    c.database.from("tama_positive_memories").delete().eq("user_id", uid).select(),
    c.database.from("tama_friends").delete().eq("user_id", uid).select(),
    c.database.from("tama_invite_codes").delete().eq("owner_id", uid).select(),
  ]).catch(() => undefined);
}
