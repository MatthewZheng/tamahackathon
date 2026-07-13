import type { SpriteState } from "@/lib/tama/types";
import type { SpriteTint, SpriteSpecies } from "@/lib/tama/store";

export type SpriteStage = 1 | 2 | 3;

const TINT_HUE: Record<SpriteTint, number> = {
  default: 0,
  peach: 25,
  mint: 90,
  lilac: 250,
};

// Original pixel creatures. Species are feature variations on a shared body —
// not derivative of any protected character designs.
export function PocketSprite({
  state = "idle",
  size = 96,
  reducedMotion = false,
  thinking = false,
  tint = "default",
  species = "blob",
  posture = "normal",
  stage = 1,
  ariaName,
}: {
  state?: SpriteState;
  size?: number;
  reducedMotion?: boolean;
  thinking?: boolean;
  tint?: SpriteTint;
  species?: SpriteSpecies;
  posture?: "normal" | "attentive" | "listening" | "tilt";
  stage?: SpriteStage;
  ariaName?: string;
}) {
  const eyeH = state === "sleepy" || state === "low" ? 1.5 : state === "celebrating" ? 3.5 : 3;
  const mouth =
    state === "celebrating"
      ? "M13 20 q3 3 6 0"
      : state === "low"
        ? "M14 21 h4"
        : state === "sleepy"
          ? "M14 21 q2 1 4 0"
          : state === "perked" || posture === "attentive"
            ? "M13 20 q3 2 6 0"
            : "M14 20 q2 1 4 0";

  const bodyBob = reducedMotion
    ? "none"
    : state === "sleepy" || state === "low"
      ? "tama-slow-pulse 3.5s ease-in-out infinite"
      : state === "celebrating"
        ? "tama-bounce 500ms ease-in-out infinite"
        : "tama-breathe 3.2s ease-in-out infinite";

  const blinkAnim = reducedMotion ? "none" : "tama-blink 5s ease-in-out infinite";

  const cheeks = state === "perked" || state === "celebrating";
  const sleepy = state === "sleepy" || state === "low";

  const hue = TINT_HUE[tint] ?? 0;

  // Species-specific "ears" region (rendered on top of the body head).
  // Uses currentColor for ink so it matches LCD contrast.
  const wagging = !reducedMotion && (state === "perked" || state === "celebrating");
  const droop = state === "sleepy" || state === "low";

  const tiltDeg = posture === "listening" ? -6 : posture === "tilt" ? -8 : posture === "attentive" ? -3 : 0;

  return (
    <div
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        filter: hue ? `hue-rotate(${hue}deg)` : undefined,
        transform: tiltDeg ? `rotate(${tiltDeg}deg)` : undefined,
        transition: reducedMotion ? undefined : "transform 220ms ease-out",
      }}
      className="relative flex items-end justify-center"
      aria-label={`${ariaName ?? "pocket"} is ${state}`}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        style={{ animation: bodyBob }}
      >
        {/* Base body — shared across species */}
        <g fill="currentColor">
          {/* Species ears */}
          {species === "blob" && (
            <>
              <rect x="7" y="6" width="3" height="4" />
              <rect x="22" y="6" width="3" height="4" />
              <rect x="6" y="7" width="2" height="2" />
              <rect x="24" y="7" width="2" height="2" />
            </>
          )}
          {species === "cat" && (
            <>
              <rect x="8" y="7" width="4" height="1" />
              <rect x="9" y="6" width="3" height="1" />
              <rect x="9" y="5" width="2" height="1" />
              <rect x="10" y="4" width="1" height="1" />
              <rect x="20" y="7" width="4" height="1" />
              <rect x="20" y="6" width="3" height="1" />
              <rect x="21" y="5" width="2" height="1" />
              <rect x="21" y="4" width="1" height="1" />
              <rect x="4" y="16" width="2" height="1" />
              <rect x="4" y="18" width="2" height="1" />
              <rect x="26" y="16" width="2" height="1" />
              <rect x="26" y="18" width="2" height="1" />
            </>
          )}
          {species === "dog" && (
            <>
              <rect x="7" y="7" width="3" height="1" />
              <rect x="5" y="8" width="3" height="3" />
              <rect x="4" y="11" width="3" height="3" />
              <rect x="4" y="14" width="2" height="1" />
              <rect x="22" y="7" width="3" height="1" />
              <rect x="24" y="8" width="3" height="3" />
              <rect x="25" y="11" width="3" height="3" />
              <rect x="26" y="14" width="2" height="1" />
            </>
          )}
          {species === "bunny" && (
            <g
              style={{
                transformOrigin: "16px 10px",
                transform: droop ? "rotate(8deg)" : "none",
                transition: reducedMotion ? undefined : "transform 250ms ease",
              }}
            >
              <rect x="9" y="2" width="3" height="6" />
              <rect x="10" y="1" width="1" height="1" />
              <rect x="20" y="2" width="3" height="6" />
              <rect x="21" y="1" width="1" height="1" />
            </g>
          )}

          {/* Stage 2 — tuft */}
          {stage >= 2 && (
            <>
              <rect x="15" y="7" width="1" height="1" />
              <rect x="15" y="6" width="2" height="1" />
              <rect x="16" y="5" width="1" height="1" />
            </>
          )}



          {/* head/body */}
          <rect x="9" y="8" width="14" height="2" />
          <rect x="7" y="10" width="18" height="2" />
          <rect x="6" y="12" width="20" height="10" />
          <rect x="7" y="22" width="18" height="2" />
          <rect x="9" y="24" width="14" height="2" />
          {/* feet */}
          <rect x="10" y="26" width="3" height="2" />
          <rect x="19" y="26" width="3" height="2" />

          {/* Species tails */}
          {species === "cat" && (
            <g>
              <rect x="26" y="19" width="1" height="4" />
              <rect x="27" y="17" width="1" height="3" />
              <rect x="26" y="16" width="1" height="1" />
            </g>
          )}
          {species === "dog" && (
            <g
              style={{
                transformOrigin: "26px 21px",
                animation: wagging ? "tama-wag 220ms ease-in-out infinite" : undefined,
              }}
            >
              <rect x="26" y="20" width="2" height="2" />
              <rect x="28" y="19" width="1" height="2" />
            </g>
          )}
          {species === "bunny" && <rect x="26" y="20" width="2" height="2" />}

          {/* Stage 3 — bloom stem + center (ink) */}
          {stage >= 3 && (
            <>
              <rect x="4" y="23" width="1" height="2" />
              <rect x="4" y="21" width="1" height="1" />
            </>
          )}
        </g>


        {/* Face background */}
        <g fill="var(--color-lcd)">
          <rect x="10" y="13" width="12" height="8" />
          {species === "bunny" && (
            <>
              <rect x="10" y="4" width="1" height="3" />
              <rect x="21" y="4" width="1" height="3" />
            </>
          )}
        </g>


        {/* Eyes */}
        <g fill="currentColor" style={{ animation: blinkAnim, transformOrigin: "16px 16px" }}>
          <rect x="12" y={17 - eyeH / 2} width="2" height={eyeH} />
          <rect x="18" y={17 - eyeH / 2} width="2" height={eyeH} />
        </g>

        {cheeks && (
          <g fill="var(--color-orchid)" opacity="0.75">
            <rect x="10" y="18" width="1" height="1" />
            <rect x="21" y="18" width="1" height="1" />
          </g>
        )}

        {/* Stage 3 — bloom petals (cheek accent color) */}
        {stage >= 3 && (
          <g fill="var(--color-orchid)">
            <rect x="3" y="21" width="1" height="1" />
            <rect x="5" y="21" width="1" height="1" />
            <rect x="4" y="20" width="1" height="1" />
            <rect x="4" y="22" width="1" height="1" />
          </g>
        )}


        <path
          d={mouth}
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          strokeLinecap="square"
        />
      </svg>

      {state === "celebrating" && !reducedMotion && (
        <>
          <span className="absolute text-[10px]" style={{ top: 4, left: 6, animation: "tama-sparkle 900ms ease-in-out infinite" }}>✦</span>
          <span className="absolute text-[10px]" style={{ top: 2, right: 6, animation: "tama-sparkle 900ms ease-in-out infinite 300ms" }}>✧</span>
        </>
      )}

      {sleepy && (
        <span className="absolute font-mono text-xs opacity-70" style={{ top: 0, right: 4, animation: reducedMotion ? "none" : "tama-slow-pulse 2s ease-in-out infinite" }}>
          z
        </span>
      )}

      {thinking && (
        <span
          className="absolute font-mono text-xs opacity-80"
          style={{ top: -2, left: "50%", transform: "translateX(-50%)", animation: reducedMotion ? "none" : "tama-slow-pulse 1.1s ease-in-out infinite" }}
          aria-label={`${ariaName ?? "pocket"} is thinking`}
        >
          · · ·
        </span>
      )}
    </div>
  );
}
