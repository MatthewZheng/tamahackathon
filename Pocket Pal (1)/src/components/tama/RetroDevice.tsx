import { PocketSprite } from "./PocketSprite";
import { useTama } from "@/lib/tama/store";

const KEY_LABELS: Array<{ k: "A" | "B" | "C" }> = [{ k: "A" }, { k: "B" }, { k: "C" }];

export function RetroDevice() {
  const { state, dispatch } = useTama();
  const { currentPrompt, spriteState, consent } = state;
  const pet = state.petName.toLowerCase();

  const lastPocket = [...state.conversation].reverse().find((m) => m.from === "pocket");
  const displayMessage = lastPocket?.text ?? currentPrompt.question;

  return (
    <div className="bezel-shell relative mx-auto w-full max-w-md rounded-[42px] p-6 pb-8">
      {/* Top gold trim */}
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-lime shadow-[0_0_6px_var(--color-lime)]" />
          <span className="text-xs font-medium tracking-[0.2em] text-charcoal/60">TAMA</span>
        </div>
        <span className="font-mono text-[10px] tracking-widest text-charcoal/50">
          v0.1 · {pet.toUpperCase()}
        </span>
      </div>

      {/* LCD screen */}
      <div className="lcd-screen scanlines relative aspect-[4/3] w-full overflow-hidden rounded-2xl scanlines-after">
        <div className="absolute inset-0 pixel-grid opacity-30" />

        {/* Room floor */}
        <div className="absolute inset-x-4 bottom-8 h-[2px] bg-current opacity-40" />
        {/* Sun/moon */}
        <div className="absolute right-4 top-3 h-3 w-3 rounded-full border-2 border-current opacity-60" />

        {/* Sprite */}
        <div className="absolute inset-x-0 bottom-9 flex justify-center">
          <PocketSprite state={spriteState} size={112} reducedMotion={consent.reducedMotion} thinking={state.thinking} tint={state.spriteTint} ariaName={pet} />
        </div>

        {/* Message balloon */}
        <div className="absolute inset-x-3 top-3 rounded-lg border-2 border-current/70 bg-lcd-dim/40 px-3 py-2">
          <p className="text-lg leading-tight" style={{ fontFamily: "var(--font-mono-lcd)" }}>
            {displayMessage}
          </p>
        </div>

        {/* Status glyphs */}
        <div className="absolute bottom-1.5 left-3 flex gap-2 text-[10px] uppercase tracking-widest opacity-70">
          <span>rest</span>
          <span>·</span>
          <span>body</span>
          <span>·</span>
          <span>spark</span>
        </div>
      </div>

      {/* Options row */}
      <div className="mt-4 grid grid-cols-3 gap-2 px-1 text-center">
        {currentPrompt.options.map((opt, i) => (
          <div
            key={i}
            className="rounded-lg border border-charcoal/10 bg-cream/70 px-2 py-1.5 text-xs font-medium text-charcoal/80"
          >
            {opt}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {KEY_LABELS.map(({ k }, i) => (
          <button
            key={k}
            disabled={state.thinking}
            onClick={() =>
              dispatch({
                type: "quickAnswer",
                key: k,
                label: currentPrompt.options[i],
              })
            }
            className="physical-button active:physical-button-pressed group flex h-14 items-center justify-center rounded-full font-bold text-charcoal/80 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Answer ${k}: ${currentPrompt.options[i]}`}
          >
            <span className="text-xl">{k}</span>
          </button>
        ))}
      </div>

      {/* Small "next question" link */}
      <div className="mt-3 flex items-center justify-between px-1 text-xs text-charcoal/60">
        <button
          onClick={() => dispatch({ type: "advancePrompt" })}
          className="rounded-md px-2 py-1 hover:bg-charcoal/5"
        >
          new question
        </button>
        <span className="font-mono text-[10px]">
          {state.spriteState}
        </span>
      </div>
    </div>
  );
}
