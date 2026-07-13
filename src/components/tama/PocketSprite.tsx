import type { SpriteState } from "@/lib/tama/types";

// Original pixel-inspired blob creature. Not derivative of any protected trade dress.
// Renders on the LCD; ink color adapts to the background.
export function PocketSprite({
  state = "idle",
  size = 96,
  reducedMotion = false,
}: {
  state?: SpriteState;
  size?: number;
  reducedMotion?: boolean;
}) {
  const eyeH = state === "sleepy" || state === "low" ? 1.5 : state === "celebrating" ? 3.5 : 3;
  const mouth =
    state === "celebrating"
      ? "M13 20 q3 3 6 0"
      : state === "low"
        ? "M14 21 h4"
        : state === "sleepy"
          ? "M14 21 q2 1 4 0"
          : state === "perked"
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

  // Cheek dots when happy
  const cheeks = state === "perked" || state === "celebrating";
  // Zzz when sleepy
  const sleepy = state === "sleepy" || state === "low";

  return (
    <div
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      className="relative flex items-end justify-center"
      aria-label={`Pocket is ${state}`}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        style={{ animation: bodyBob }}
      >
        {/* Body — chunky rounded blob */}
        <g fill="currentColor">
          {/* ears */}
          <rect x="7" y="6" width="3" height="4" />
          <rect x="22" y="6" width="3" height="4" />
          <rect x="6" y="7" width="2" height="2" />
          <rect x="24" y="7" width="2" height="2" />
          {/* head/body outline via stacked rects for pixel feel */}
          <rect x="9" y="8" width="14" height="2" />
          <rect x="7" y="10" width="18" height="2" />
          <rect x="6" y="12" width="20" height="10" />
          <rect x="7" y="22" width="18" height="2" />
          <rect x="9" y="24" width="14" height="2" />
          {/* feet */}
          <rect x="10" y="26" width="3" height="2" />
          <rect x="19" y="26" width="3" height="2" />
        </g>

        {/* Face — inside body, use a light color for negative space */}
        <g fill="var(--color-lcd)">
          <rect x="10" y="13" width="12" height="8" />
        </g>

        {/* Eyes */}
        <g fill="currentColor" style={{ animation: blinkAnim, transformOrigin: "16px 16px" }}>
          <rect x="12" y={17 - eyeH / 2} width="2" height={eyeH} />
          <rect x="18" y={17 - eyeH / 2} width="2" height={eyeH} />
        </g>

        {/* Cheeks when happy */}
        {cheeks && (
          <g fill="var(--color-orchid)" opacity="0.75">
            <rect x="10" y="18" width="1" height="1" />
            <rect x="21" y="18" width="1" height="1" />
          </g>
        )}

        {/* Mouth */}
        <path
          d={mouth}
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          strokeLinecap="square"
        />
      </svg>

      {/* Sparkles */}
      {state === "celebrating" && !reducedMotion && (
        <>
          <span
            className="absolute text-[10px]"
            style={{
              top: 4,
              left: 6,
              animation: "tama-sparkle 900ms ease-in-out infinite",
            }}
          >
            ✦
          </span>
          <span
            className="absolute text-[10px]"
            style={{
              top: 2,
              right: 6,
              animation: "tama-sparkle 900ms ease-in-out infinite 300ms",
            }}
          >
            ✧
          </span>
        </>
      )}

      {/* Zzz */}
      {sleepy && (
        <span
          className="absolute font-mono text-xs opacity-70"
          style={{ top: 0, right: 4, animation: reducedMotion ? "none" : "tama-slow-pulse 2s ease-in-out infinite" }}
        >
          z
        </span>
      )}
    </div>
  );
}
