import { useTama } from "@/lib/tama/store";
import { PanelShell } from "./MemoryPanel";
import { storageService } from "@/lib/tama/storageService";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTama();

  const pet = state.petName.toLowerCase();
  const friendPet = state.friendPetName.toLowerCase();
  const friend = state.friendName.toLowerCase();

  return (
    <PanelShell title="settings" subtitle={`everything about ${pet} that you can control.`} onClose={onClose}>
      <div className="space-y-4">
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
        </section>

        <section className="rounded-xl border border-orchid/30 bg-orchid/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-orchid">
              demo panel · judging day
            </h3>
            <span className="rounded-full bg-orchid/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orchid">
              shift + d
            </span>
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
              <DemoBtn onClick={() => dispatch({ type: "receiveFriendNudge" })}>
                simulate {friend} nudge
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
              <DemoBtn onClick={() => dispatch({ type: "sendPetSignal" })}>{pet} → {friendPet}</DemoBtn>
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
