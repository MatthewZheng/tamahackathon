import { useTama } from "@/lib/tama/store";
import { LCDScene } from "./LCDScene";
import { YardScene } from "./YardScene";

// The big centered handheld device. LCDScene lives inside the screen.
// A/B/C physical buttons still work as an accessibility fallback and tactile feel.
export function RetroDevice() {
  const { state, dispatch } = useTama();
  const { currentPrompt } = state;
  const pet = state.petName.toLowerCase();
  const hasUnseenSocial = Boolean(
    (state.friendNudge && !state.friendNudge.resolved) || state.visiting,
  );

  return (
    <div
      className={`shell-${state.shellTheme} bezel-shell relative mx-auto rounded-[42px] p-4 pb-5 lg:p-5 lg:pb-6`}
      style={{
        // Desktop: size by viewport height so LCD lands ~65-70dvh. Mobile: near edge-to-edge.
        width: "min(94vw, calc((100dvh - 11rem) * 1.15))",
        maxWidth: "min(94vw, 720px)",
      }}
    >
      {/* Top trim */}
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              state.thinking ? "bg-orchid animate-pulse" : "bg-lime"
            } shadow-[0_0_6px_currentColor]`}
          />
          <span className="text-[11px] font-medium tracking-[0.24em] text-charcoal">GOTCHU</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-charcoal">
            v0.1 · {pet.toUpperCase()}
          </span>
          <button
            onClick={() =>
              dispatch({
                type: "setScreenView",
                view: state.screenView === "yard" ? "chat" : "yard",
              })
            }
            className="relative rounded-full border border-charcoal/20 bg-cream/70 px-2 py-0.5 text-[10px] uppercase tracking-widest text-charcoal hover:bg-cream"
            aria-label={state.screenView === "yard" ? "back to pocket" : "open the yard"}
          >
            {state.screenView === "yard" ? "◂ pocket" : "yard"}
            {hasUnseenSocial && state.screenView !== "yard" && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orchid shadow-[0_0_4px_currentColor]" />
            )}
          </button>
        </div>
      </div>

      {/* LCD */}
      {state.screenView === "yard" ? <YardScene /> : <LCDScene />}

      {/* Physical A/B/C buttons — 56px min, full-contrast labels */}
      {state.screenView === "chat" && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(["A", "B", "C"] as const).map((k, i) => (
            <div key={k} className="flex flex-col items-center gap-1">
              <button
                disabled={state.thinking}
                onClick={() =>
                  dispatch({
                    type: "quickAnswer",
                    key: k,
                    label: currentPrompt.options[i],
                  })
                }
                className="physical-button active:physical-button-pressed active:translate-y-[1px] flex items-center justify-center rounded-full font-bold text-charcoal disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  minHeight: 56,
                  minWidth: 56,
                  height: 56,
                  width: 56,
                  // ring color matches charcoal (bezel-facing)
                  outlineColor: "var(--charcoal)",
                }}
                aria-label={`Answer ${k}: ${currentPrompt.options[i]}`}
              >
                <span className="text-lg">{k}</span>
              </button>
              <span
                className="max-w-[10rem] truncate text-[11px] text-charcoal"
                title={currentPrompt.options[i]}
              >
                {currentPrompt.options[i]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
