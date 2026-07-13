import { useEffect, useState } from "react";
import { useTama, type ShellTheme, type OverlayShape, type OverlaySize, type SpriteTint, type SpriteSpecies } from "@/lib/tama/store";
import { PanelShell } from "./MemoryPanel";
import { PocketSprite } from "./PocketSprite";
import { storageService } from "@/lib/tama/storageService";
import { AccountSection } from "./AccountSection";
import { isForceLocalReplies, setForceLocalReplies } from "@/lib/tama/pocketReplyService";
import {
  setBandDisabled,
  isBandAvailable,
  isBandConfigured,
  getBandSlot,
  setBandSlot,
  type BandSlot,
} from "@/lib/tama/nudgeTransport";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTama();
  const [bandOff, setBandOff] = useState(false);
  const [slot, setSlot] = useState<BandSlot>(() => getBandSlot());
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pipOpen, setPipOpen] = useState(false);
  const [forceLocal, setForceLocalState] = useState<boolean>(() => isForceLocalReplies());
  useEffect(() => {
    void isBandConfigured().then(setConfigured);
  }, []);
  useEffect(() => {
    const onPip = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setPipOpen(Boolean(detail?.open));
    };
    window.addEventListener("tama:pip", onPip);
    return () => window.removeEventListener("tama:pip", onPip);
  }, []);



  const pet = state.petName.toLowerCase();
  const friendPet = state.friendPetName.toLowerCase();
  const friend = state.friendName.toLowerCase();

  return (
    <PanelShell title="settings" subtitle={`everything about ${pet} that you can control.`} onClose={onClose}>
      <div className="space-y-4">
        <AccountSection />
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/60">
            consent & privacy
          </h3>
          <div className="space-y-1">
            <Toggle k="memoryEnabled" label={`allow ${pet} to remember things`} />
            <Toggle k="petSignalsEnabled" label={`allow ${pet}-to-${friendPet} signals`} />
            <Toggle k="proactiveEnabled" label={`allow ${pet} to prompt me`} />
            <Toggle k="soundEnabled" label="sound" />
            <Toggle k="reducedMotion" label="reduced motion" />
          </div>
          <div className="mt-2 rounded-lg bg-cream/70 p-3 text-xs text-charcoal/70">
            <p>• you can see everything {pet} remembers.</p>
            <p>• you can edit or delete any inference.</p>
            <p>• private messages are never shared with friends.</p>
            <p>• pet signals never include your exact mood or words.</p>
            <p>• prototype data is stored on this device.</p>
          </div>
          <div className="mt-2 rounded-lg border border-charcoal/10 bg-white/60 p-3 text-xs text-charcoal/75">
            <p className="mb-1 font-semibold text-charcoal">what leaves this device</p>
            <p>1. reply generation — your message, recent conversation, meter values, and active memories when memory is on.</p>
            <p>2. optional account sync — only when signed in.</p>
            <p>3. friend nudges — a single generic line, never your words or moods.</p>
          </div>
        </section>

        <AppearanceSection />



        <section className="rounded-xl border border-orchid/30 bg-orchid/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-orchid">
              demo panel · judging day
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-charcoal/15 bg-white/70 px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider text-charcoal/70">
                last reply: {state.lastReplySource ?? "—"}
              </span>
              <span className="rounded-full border border-charcoal/15 bg-white/70 px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider text-charcoal/70">
                last signal: {state.lastNudgeTransport ?? "—"}
              </span>
              <span className="rounded-full border border-charcoal/15 bg-white/70 px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider text-charcoal/70">
                pop out: {pipOpen ? "open" : "closed"}
              </span>
              <HydraStatusBadge />


              <button
                onClick={() => {
                  const next = !bandOff;
                  setBandOff(next);
                  setBandDisabled(next);
                }}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider ${
                  bandOff
                    ? "border-red-400/40 bg-red-50 text-red-700"
                    : "border-charcoal/15 bg-white/70 text-charcoal/70"
                }`}
                title={
                  configured === false
                    ? "band not configured (env keys missing)"
                    : isBandAvailable()
                    ? "band on"
                    : "band forced off"
                }
              >
                band: {configured === false ? "unconfigured" : bandOff ? "off" : "on"}
              </button>
              <button
                onClick={() => {
                  const next: BandSlot = slot === "a" ? "b" : "a";
                  setSlot(next);
                  setBandSlot(next);
                }}
                className="rounded-full border border-charcoal/15 bg-white/70 px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider text-charcoal/70"
                title="which band agent slot this device represents. flip on the friend's tab."
              >
                slot: {slot}
              </button>
              <button
                onClick={() => {
                  const next = !forceLocal;
                  setForceLocalState(next);
                  setForceLocalReplies(next);
                }}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider ${
                  forceLocal
                    ? "border-red-400/40 bg-red-50 text-red-700"
                    : "border-charcoal/15 bg-white/70 text-charcoal/70"
                }`}
                title="rehearsal-only emergency brake — skips remote AI and uses the local fallback."
              >
                force local: {forceLocal ? "on" : "off"}
              </button>
              <span className="rounded-full bg-orchid/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orchid">
                shift + d
              </span>


            </div>
          </div>
          <p className="mb-3 text-[11px] italic text-charcoal/60">
            hidden from real users. these controls simulate flows without waiting or typing crisis language.
          </p>

          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
              key demo flows
            </p>
            <div className="grid grid-cols-2 gap-2">
              <DemoBtn onClick={() => dispatch({ type: "skipDays", days: 3 })}>
                simulate 3 days away
              </DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "seedWeek" })}>
                seed sample memories
              </DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "openCrisisDemo" })}>
                preview crisis handoff <span className="text-orchid">(demo)</span>
              </DemoBtn>
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
              sprite state cycler
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {(["idle", "perked", "sleepy", "low", "celebrating"] as const).map((s) => (
                <DemoBtn key={s} onClick={() => dispatch({ type: "setSprite", sprite: s })}>
                  <span className={state.spriteState === s ? "font-semibold text-orchid" : ""}>{s}</span>
                </DemoBtn>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
              bond & evolution (stage {state.evolutionStage}, bond {state.bond})
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as const).map((s) => (
                <DemoBtn key={s} onClick={() => dispatch({ type: "setEvolutionStage", stage: s })}>
                  <span className={state.evolutionStage === s ? "font-semibold text-orchid" : ""}>
                    stage {s}
                  </span>
                </DemoBtn>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <DemoBtn onClick={() => dispatch({ type: "bondBump", amount: 10 })}>+10 bond</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "replayEvolutionMoment", stage: 2 })}>
                trigger evolution moment
              </DemoBtn>
            </div>
          </div>


          <details>
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
              more triggers
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { rest: 20 } })}>trigger low rest</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { body: 20 } })}>trigger low body</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { spark: 20 } })}>trigger low spark</DemoBtn>
              <DemoBtn onClick={() => { dispatch({ type: "setMeters", wellbeing: { spark: 85, rest: 75 } }); dispatch({ type: "setSprite", sprite: "celebrating" }); }}>trigger good day</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "quickAnswer", key: "B", label: "everything is too much" })}>
                trigger overwhelmed
              </DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "sendPetSignal", kind: "nudge" })}>{pet} → {friendPet}</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "markRealCheckin" })}>mark real-life check-in</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "clearCrisis" })}>clear crisis state</DemoBtn>
              <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { rest: 65, body: 60, spark: 55 } })}>
                reset meters
              </DemoBtn>
              <DemoBtn
                onClick={() => {
                  storageService.clear();
                  dispatch({ type: "resetAll" });
                }}
              >
                reset all local data
              </DemoBtn>
            </div>
          </details>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/60">
            sponsor abstractions (future)
          </h3>
          <ul className="space-y-1 rounded-lg bg-cream/70 p-3 text-xs text-charcoal/70">
            <li>• insforgeService — deployment, auth, sync (local for now)</li>
            <li>• memoryProvider — longitudinal memory (cognee / hydra adapters)</li>
            <li>• petSignalService — governed agent-to-agent (BAND future)</li>
          </ul>
        </section>
      </div>
    </PanelShell>
  );
}

function Toggle({ k, label }: { k: keyof ReturnType<typeof useTama>["state"]["consent"]; label: string }) {
  const { state, dispatch } = useTama();
  const on = state.consent[k];
  return (
    <button
      onClick={() => dispatch({ type: "toggleConsent", key: k })}
      className="flex w-full items-center justify-between rounded-lg border border-charcoal/10 bg-white/60 px-3 py-2 text-sm text-charcoal"
    >
      <span>{label}</span>
      <span
        className={`h-5 w-9 rounded-full transition-colors ${on ? "bg-orchid" : "bg-charcoal/20"} relative`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function HydraStatusBadge() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    void (async () => {
      const { isHydraConfigured } = await import("@/lib/tama/hydraMemoryProvider");
      setConfigured(await isHydraConfigured());
    })();
  }, []);
  return (
    <span
      className="rounded-full border border-charcoal/15 bg-white/70 px-2 py-0.5 text-[10px] font-mono lowercase tracking-wider text-charcoal/70"
      title="hydradb powers semantic recall + connections graph"
    >
      hydra: {configured === null ? "…" : configured ? "on" : "off"}
    </span>
  );
}



const THEMES: Array<{ id: ShellTheme; label: string }> = [
  { id: "classic", label: "classic" },
  { id: "midnight", label: "midnight" },
  { id: "blossom", label: "blossom" },
  { id: "moss", label: "moss" },
];
const SHAPES: Array<{ id: OverlayShape; label: string }> = [
  { id: "shell", label: "shell" },
  { id: "round", label: "round" },
  { id: "egg", label: "egg" },
];
const SIZES: Array<{ id: OverlaySize; label: string }> = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
];
const TINTS: Array<{ id: SpriteTint; label: string }> = [
  { id: "default", label: "classic" },
  { id: "peach", label: "peach" },
  { id: "mint", label: "mint" },
  { id: "lilac", label: "lilac" },
];
const SPECIES: Array<{ id: SpriteSpecies; label: string }> = [
  { id: "blob", label: "blob" },
  { id: "cat", label: "cat" },
  { id: "dog", label: "dog" },
  { id: "bunny", label: "bunny" },
];

function AppearanceSection() {
  const { state, dispatch } = useTama();
  const pet = state.petName.toLowerCase();
  const setAppearance = (
    patch: Partial<Pick<typeof state, "spriteTint" | "spriteSpecies" | "shellTheme" | "overlayShape" | "overlaySize">>,
  ) => dispatch({ type: "setAppearance", patch });

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/60">
        appearance
      </h3>

      {/* Live preview */}
      <div className={`shell-${state.shellTheme} overlay-shape-${state.overlayShape} mb-3 flex items-center gap-3 rounded-2xl p-3`}>
        <div className="bezel-shell flex items-center gap-2 p-2">
          <div className="lcd-screen scanlines scanlines-after flex h-14 w-14 items-center justify-center overflow-hidden">
            <PocketSprite state="idle" size={44} tint={state.spriteTint} species={state.spriteSpecies} reducedMotion={state.consent.reducedMotion} ariaName={pet} stage={state.evolutionStage} />
          </div>
        </div>
        <p className="text-[11px] italic text-charcoal/70">
          live preview — changes save instantly.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-charcoal/50">shell theme</p>
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setAppearance({ shellTheme: t.id })}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  state.shellTheme === t.id
                    ? "border-orchid bg-orchid/10 text-charcoal"
                    : "border-charcoal/15 bg-white/60 text-charcoal/70"
                }`}
              >
                <span className={`shell-${t.id} inline-block h-4 w-4 rounded-full bezel-shell`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-charcoal/50">overlay shape</p>
          <div className="flex gap-1.5">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => setAppearance({ overlayShape: s.id })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  state.overlayShape === s.id
                    ? "border-orchid bg-orchid/10 text-charcoal"
                    : "border-charcoal/15 bg-white/60 text-charcoal/70"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-charcoal/50">overlay size</p>
          <div className="flex gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setAppearance({ overlaySize: s.id })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  state.overlaySize === s.id
                    ? "border-orchid bg-orchid/10 text-charcoal"
                    : "border-charcoal/15 bg-white/60 text-charcoal/70"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-charcoal/50">species</p>
          <div className="flex flex-wrap gap-1.5">
            {SPECIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setAppearance({ spriteSpecies: s.id })}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  state.spriteSpecies === s.id
                    ? "border-orchid bg-orchid/10 text-charcoal"
                    : "border-charcoal/15 bg-white/60 text-charcoal/70"
                }`}
              >
                <span className="lcd-screen flex h-5 w-5 items-center justify-center overflow-hidden rounded-full">
                  <PocketSprite state="idle" size={18} tint={state.spriteTint} species={s.id} reducedMotion />
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-charcoal/50">sprite tint</p>
          <div className="flex flex-wrap gap-1.5">
            {TINTS.map((t) => (
              <button
                key={t.id}
                onClick={() => setAppearance({ spriteTint: t.id })}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  state.spriteTint === t.id
                    ? "border-orchid bg-orchid/10 text-charcoal"
                    : "border-charcoal/15 bg-white/60 text-charcoal/70"
                }`}
              >
                <span className="lcd-screen flex h-4 w-4 items-center justify-center overflow-hidden rounded-full">
                  <PocketSprite state="idle" size={16} tint={t.id} species={state.spriteSpecies} reducedMotion />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-charcoal/10 bg-white/60 px-3 py-2 text-left text-xs text-charcoal/80 hover:bg-white"
    >
      {children}
    </button>
  );
}
