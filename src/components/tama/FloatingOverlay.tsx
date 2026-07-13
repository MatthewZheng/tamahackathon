import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";
import { PipOverlay } from "./PipOverlay";

const CORNER_POS: Record<string, string> = {
  br: "bottom-4 right-4",
  bl: "bottom-4 left-4",
  tr: "top-4 right-4",
  tl: "top-4 left-4",
};

type DocPipWindow = Window & { document: Document };
type DocPip = {
  requestWindow: (opts: { width: number; height: number }) => Promise<DocPipWindow>;
  window: DocPipWindow | null;
};

function hasDocPip(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

function copyStylesInto(pipWin: DocPipWindow) {
  const pipDoc = pipWin.document;
  // Base sizing so the body fills the window
  pipDoc.documentElement.style.height = "100%";
  pipDoc.body.style.height = "100%";
  pipDoc.body.style.margin = "0";
  pipDoc.body.className = document.body.className;

  // Copy :root CSS custom properties (design tokens)
  try {
    const root = getComputedStyle(document.documentElement);
    const vars: string[] = [];
    for (let i = 0; i < root.length; i++) {
      const prop = root[i];
      if (prop.startsWith("--")) {
        vars.push(`${prop}: ${root.getPropertyValue(prop)};`);
      }
    }
    if (vars.length) {
      const styleEl = pipDoc.createElement("style");
      styleEl.textContent = `:root { ${vars.join(" ")} } html, body { background: var(--color-cream, #f6f0e4); color: var(--color-charcoal, #2b2432); }`;
      pipDoc.head.appendChild(styleEl);
    }
  } catch { /* noop */ }

  // Copy every stylesheet — prefer inlining cssRules when readable, else clone the node
  document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
    'link[rel="stylesheet"], style'
  ).forEach((node) => {
    try {
      if (node.tagName === "LINK") {
        pipDoc.head.appendChild(node.cloneNode(true));
        return;
      }
      // <style>
      const src = node as HTMLStyleElement;
      const sheet = src.sheet as CSSStyleSheet | null;
      let inlined = false;
      if (sheet) {
        try {
          const rules = Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join("\n");
          if (rules) {
            const el = pipDoc.createElement("style");
            el.textContent = rules;
            pipDoc.head.appendChild(el);
            inlined = true;
          }
        } catch {
          // cross-origin — fall through to node clone
        }
      }
      if (!inlined) {
        pipDoc.head.appendChild(node.cloneNode(true));
      }
    } catch { /* noop, skip this sheet */ }
  });
}

const PIP_DIMS: Record<"s" | "m" | "l", { width: number; height: number }> = {
  s: { width: 240, height: 140 },
  m: { width: 320, height: 180 },
  l: { width: 420, height: 240 },
};

const OVERLAY_SCALE: Record<"s" | "m" | "l", number> = { s: 0.8, m: 1, l: 1.25 };

export function FloatingOverlay() {
  const { state, dispatch } = useTama();
  const pet = state.petName.toLowerCase();

  const [pipWin, setPipWin] = useState<DocPipWindow | null>(null);
  const [pipMount, setPipMount] = useState<HTMLElement | null>(null);
  // Detect PiP support after mount to avoid SSR/CSR hydration mismatch.
  const [pipSupported, setPipSupported] = useState(false);
  useEffect(() => {
    setPipSupported(hasDocPip());
  }, []);
  const pipWinRef = useRef<DocPipWindow | null>(null);

  const closePip = () => {
    const w = pipWinRef.current;
    if (w && !w.closed) {
      try { w.close(); } catch { /* noop */ }
    }
    pipWinRef.current = null;
    setPipWin(null);
    setPipMount(null);
    window.dispatchEvent(new CustomEvent("tama:pip", { detail: { open: false } }));
    dispatch({ type: "setOverlay", overlay: "collapsed" });
  };

  const openPip = async () => {
    if (!pipSupported || pipWinRef.current) return;
    const api = (window as unknown as { documentPictureInPicture: DocPip }).documentPictureInPicture;
    const dims = PIP_DIMS[state.overlaySize];
    const win = await api.requestWindow({ width: dims.width, height: dims.height });
    copyStylesInto(win);

    const mount = win.document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    win.document.body.appendChild(mount);

    pipWinRef.current = win;
    setPipWin(win);
    setPipMount(mount);
    window.dispatchEvent(new CustomEvent("tama:pip", { detail: { open: true } }));

    win.addEventListener("pagehide", () => {
      pipWinRef.current = null;
      setPipWin(null);
      setPipMount(null);
      window.dispatchEvent(new CustomEvent("tama:pip", { detail: { open: false } }));
      dispatch({ type: "setOverlay", overlay: "collapsed" });
    });
  };


  // Crisis while PiP open — focus the main window so full handoff is visible
  useEffect(() => {
    if (pipWin && state.crisis.active) {
      try { window.focus(); } catch { /* noop */ }
    }
  }, [pipWin, state.crisis.active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const w = pipWinRef.current;
      if (w && !w.closed) {
        try { w.close(); } catch { /* noop */ }
      }
    };
  }, []);

  // If PiP is open, don't render the in-page overlay (avoid doubles)
  if (pipWin && pipMount) {
    return createPortal(<PipOverlay onClose={closePip} />, pipMount);
  }

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

  const scale = OVERLAY_SCALE[state.overlaySize];
  const origin: Record<string, string> = {
    br: "bottom right",
    bl: "bottom left",
    tr: "top right",
    tl: "top left",
  };

  return (
    <div
      className={`fixed z-30 ${CORNER_POS[state.overlayCorner]} animate-tama-fade-in shell-${state.shellTheme} overlay-shape-${state.overlayShape}`}
      role="region"
      aria-label={`${pet} overlay`}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: origin[state.overlayCorner],
      }}
    >
      <div
        className={`bezel-shell flex items-center gap-2 p-2 ${
          collapsed ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (collapsed) dispatch({ type: "setOverlay", overlay: "expanded" });
        }}
      >
        <div className="lcd-screen scanlines scanlines-after flex h-14 w-14 items-center justify-center overflow-hidden">
          <PocketSprite state={state.spriteState} size={44} reducedMotion={state.consent.reducedMotion} tint={state.spriteTint} species={state.spriteSpecies} ariaName={pet} stage={state.evolutionStage} />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1 pr-1">
            {pipSupported && (
              <IconBtn label="pop out to desktop" onClick={openPip}>
                ⧉
              </IconBtn>
            )}
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
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs text-charcoal hover:bg-white"
    >
      {children}
    </button>
  );
}
