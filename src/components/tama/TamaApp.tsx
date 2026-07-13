import { useTama } from "@/lib/tama/store";
import { TamaProvider } from "@/lib/tama/store";
import { RetroDevice } from "./RetroDevice";
import { MemoryPanel } from "./MemoryPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ActivityOverlay } from "./Activities";
import { CrisisHandoff } from "./CrisisHandoff";
import { FloatingOverlay } from "./FloatingOverlay";
import { TamaErrorBoundary } from "./TamaErrorBoundary";
import { Onboarding } from "./Onboarding";

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
  const pet = state.petName.toLowerCase();

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-2">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold tracking-tight text-charcoal">tama</p>
          <p className="text-[10px] text-charcoal">
            a companion that notices, not a therapist that diagnoses
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-sm">
          <NavBtn onClick={() => dispatch({ type: "setPanel", panel: "memory" })}>
            what {pet} noticed
          </NavBtn>
          <NavBtn onClick={() => dispatch({ type: "setPanel", panel: "settings" })}>settings</NavBtn>
        </nav>
      </header>

      <div className="mx-auto flex w-full flex-col items-center gap-2 px-3 pb-8 pt-1">
        <RetroDevice />

        <p className="max-w-md text-center text-[11px] italic text-charcoal">
          you care for {pet}. {pet} notices you, remembers what helps, and cares for you too.
        </p>


        {state.returnFlowActive && (
          <div className="w-full max-w-md rounded-2xl border border-lavender/50 bg-lavender/20 p-4 text-sm text-charcoal">
            <p className="font-semibold">welcome back.</p>
            <p className="mt-1 italic text-charcoal/80">
              no catching up required. nothing broke while you were gone.
            </p>
          </div>
        )}

        <RecommendationCard />
      </div>

      <FloatingOverlay />
      <ActivityOverlay />
      {state.panel === "memory" && (
        <MemoryPanel onClose={() => dispatch({ type: "setPanel", panel: null })} />
      )}
      {state.panel === "settings" && (
        <SettingsPanel onClose={() => dispatch({ type: "setPanel", panel: null })} />
      )}
      <CrisisHandoff />
      {state.crisisDemoPreview && state.crisis.active && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full border border-orchid bg-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-orchid shadow-lg">
          demo preview · crisis handoff
        </div>
      )}

      {!state.onboarded && <Onboarding />}

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

function RecommendationCard() {
  const { state, dispatch } = useTama();
  const rec = state.pendingRecommendation;
  if (!rec) return null;
  const pet = state.petName.toLowerCase();
  const friendPet = state.friendPetName.toLowerCase();
  return (
    <div className="animate-tama-fade-in w-full max-w-md rounded-2xl border border-lavender/40 bg-lavender/20 p-3 text-sm text-charcoal">
      <p className="mb-2">
        {rec === "breathe" && `${pet} is doing their breaths. want to join?`}
        {rec === "sit" && `${pet} is going to sit here for a minute.`}
        {rec === "water" && `${pet} only drinks what you drink.`}
        {rec === "celebrate" && "good. let's not rush past that."}
        {rec === "friend" && `want to see if ${friendPet} is around?`}
        {rec === "notice" && "tell me three things you can see."}
        {rec === "sundown" && "what was the least-bad part of today?"}
      </p>
      <div className="flex flex-wrap gap-2">
        {rec === "breathe" && (
          <RecBtn primary onClick={() => dispatch({ type: "openActivity", activity: "breathe" })}>
            breathe with {pet}
          </RecBtn>
        )}
        {rec === "sit" && (
          <RecBtn primary onClick={() => dispatch({ type: "openActivity", activity: "sit" })}>
            sit still
          </RecBtn>
        )}
        {rec === "water" && (
          <RecBtn primary onClick={() => dispatch({ type: "openActivity", activity: "water" })}>
            get water
          </RecBtn>
        )}
        {rec === "friend" && (
          <RecBtn primary onClick={() => dispatch({ type: "setScreenView", view: "yard" })}>
            open yard
          </RecBtn>
        )}
        {rec === "celebrate" && (
          <RecBtn
            primary
            onClick={() =>
              dispatch({ type: "addPositiveMemory", kind: "good moment", note: "" })
            }
          >
            keep a moment
          </RecBtn>
        )}
        <RecBtn onClick={() => dispatch({ type: "advancePrompt" })}>not now</RecBtn>
      </div>
    </div>
  );
}

function RecBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs ${
        primary
          ? "bg-orchid font-medium text-cream"
          : "border border-charcoal/15 text-charcoal/70"
      }`}
    >
      {children}
    </button>
  );
}
