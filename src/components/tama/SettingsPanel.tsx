import { useTama } from "@/lib/tama/store";
import { PanelShell } from "./MemoryPanel";
import { storageService } from "@/lib/tama/storageService";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTama();

  return (
    <PanelShell title="settings" subtitle="everything about pocket that you can control." onClose={onClose}>
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/60">
            consent & privacy
          </h3>
          <div className="space-y-1">
            <Toggle k="memoryEnabled" label="allow pocket to remember things" />
            <Toggle k="petSignalsEnabled" label="allow pocket-to-biscuit signals" />
            <Toggle k="proactiveEnabled" label="allow pocket to prompt me" />
            <Toggle k="soundEnabled" label="sound" />
            <Toggle k="reducedMotion" label="reduced motion" />
          </div>
          <div className="mt-2 rounded-lg bg-cream/70 p-3 text-xs text-charcoal/70">
            <p>• you can see everything pocket remembers.</p>
            <p>• you can edit or delete any inference.</p>
            <p>• private messages are never shared with friends.</p>
            <p>• pet signals never include your exact mood or words.</p>
            <p>• prototype data is stored on this device.</p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/60">
            demo controls · press shift + d anytime
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <DemoBtn onClick={() => dispatch({ type: "seedWeek" })}>seed one week of memory</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { rest: 20 } })}>trigger low rest</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { body: 20 } })}>trigger low body</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "setMeters", wellbeing: { spark: 20 } })}>trigger low spark</DemoBtn>
            <DemoBtn onClick={() => { dispatch({ type: "setMeters", wellbeing: { spark: 85, rest: 75 } }); dispatch({ type: "setSprite", sprite: "celebrating" }); }}>trigger good day</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "quickAnswer", key: "B", label: "everything is too much" })}>
              trigger overwhelmed
            </DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "skipDays", days: 3 })}>skip 3 days</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "sendPetSignal" })}>pocket → biscuit</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "receiveFriendNudge" })}>incoming jamie nudge</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "markRealCheckin" })}>mark real-life check-in</DemoBtn>
            <DemoBtn onClick={() => dispatch({ type: "triggerCrisis" })}>trigger crisis handoff</DemoBtn>
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
