import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";

const CORNER_POS: Record<string, string> = {
  br: "bottom-4 right-4",
  bl: "bottom-4 left-4",
  tr: "top-4 right-4",
  tl: "top-4 left-4",
};

export function FloatingOverlay() {
  const { state, dispatch } = useTama();
  const pet = state.petName.toLowerCase();
  if (state.overlayState === "hidden") {
    return (
      <button
        onClick={() => dispatch({ type: "setOverlay", overlay: "collapsed" })}
        className={`fixed z-30 ${CORNER_POS[state.overlayCorner]} rounded-full bg-charcoal/80 px-3 py-1.5 text-xs text-cream shadow-lg`}
      >
        show {pet}
      </button>
    );
  }

  const collapsed = state.overlayState === "collapsed";

  return (
    <div
      className={`fixed z-30 ${CORNER_POS[state.overlayCorner]} animate-tama-fade-in`}
      role="region"
      aria-label={`${pet} overlay`}
    >
      <div
        className={`bezel-shell flex items-center gap-2 rounded-3xl p-2 ${
          collapsed ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (collapsed) dispatch({ type: "setOverlay", overlay: "expanded" });
        }}
      >
        <div className="lcd-screen scanlines scanlines-after flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
          <PocketSprite state={state.spriteState} size={44} reducedMotion={state.consent.reducedMotion} tint={state.spriteTint} ariaName={pet} />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1 pr-1">
            <IconBtn label="minimize" onClick={() => dispatch({ type: "setOverlay", overlay: "collapsed" })}>
              –
            </IconBtn>
            <IconBtn
              label="move corner"
              onClick={() => {
                const order: Array<"br" | "bl" | "tl" | "tr"> = ["br", "bl", "tl", "tr"];
                const idx = order.indexOf(state.overlayCorner);
                dispatch({ type: "setCorner", corner: order[(idx + 1) % order.length] });
              }}
            >
              ⤡
            </IconBtn>
            <IconBtn label="hide" onClick={() => dispatch({ type: "setOverlay", overlay: "hidden" })}>
              ×
            </IconBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs text-charcoal hover:bg-white"
    >
      {children}
    </button>
  );
}
