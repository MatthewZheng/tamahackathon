import { TamaProvider, useTama } from "@/lib/tama/store";
import { RetroDevice } from "./RetroDevice";
import { Meters } from "./Meters";
import { Conversation } from "./Conversation";
import { MemoryPanel } from "./MemoryPanel";
import { SettingsPanel } from "./SettingsPanel";
import { Yard } from "./Yard";
import { ActivityOverlay } from "./Activities";
import { CrisisHandoff } from "./CrisisHandoff";
import { FloatingOverlay } from "./FloatingOverlay";
import { TamaErrorBoundary } from "./TamaErrorBoundary";

export function TamaApp() {
  return (
    <TamaErrorBoundary>
      <TamaProvider>
        <TamaScreen />
      </TamaProvider>
    </TamaErrorBoundary>
  );
}

function TamaScreen() {
  const { state, dispatch } = useTama();

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden">
      {/* Top nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="lcd-screen flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold">
            <span style={{ fontFamily: "var(--font-mono-lcd)" }}>t</span>
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-charcoal">tama</p>
            <p className="-mt-0.5 text-[11px] text-charcoal/50">
              a companion that notices, not a therapist that diagnoses
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1.5 text-sm">
          <NavBtn onClick={() => dispatch({ type: "setPanel", panel: "memory" })}>what pocket noticed</NavBtn>
          <NavBtn onClick={() => dispatch({ type: "setPanel", panel: "yard" })}>the yard</NavBtn>
          <NavBtn onClick={() => dispatch({ type: "setPanel", panel: "settings" })}>settings</NavBtn>
        </nav>
      </header>

      {/* Grid */}
      <div className="mx-auto grid max-w-6xl gap-6 px-5 pb-24 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col items-center">
          <RetroDevice />
          <p className="mt-4 max-w-md text-center text-xs italic text-charcoal/60">
            you care for pocket. pocket notices you, remembers what helps, and cares for you too.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <Meters />
          <Conversation />
          {state.returnFlowActive && (
            <div className="rounded-2xl border border-lavender/50 bg-lavender/20 p-4 text-sm text-charcoal">
              <p className="font-semibold">welcome back.</p>
              <p className="mt-1 italic text-charcoal/80">
                no catching up required. nothing broke while you were gone.
              </p>
            </div>
          )}
        </section>
      </div>

      <FloatingOverlay />
      <ActivityOverlay />
      {state.panel === "memory" && <MemoryPanel onClose={() => dispatch({ type: "setPanel", panel: null })} />}
      {state.panel === "settings" && <SettingsPanel onClose={() => dispatch({ type: "setPanel", panel: null })} />}
      {state.panel === "yard" && <Yard onClose={() => dispatch({ type: "setPanel", panel: null })} />}
      <CrisisHandoff />

      <footer className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-charcoal/40">
        press <kbd className="rounded bg-charcoal/10 px-1">shift</kbd>+<kbd className="rounded bg-charcoal/10 px-1">D</kbd> for demo controls
      </footer>
    </main>
  );
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-charcoal/10 bg-white/70 px-3 py-1.5 text-xs text-charcoal/80 shadow-sm backdrop-blur hover:bg-white"
    >
      {children}
    </button>
  );
}
