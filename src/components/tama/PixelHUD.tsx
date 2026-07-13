import { useEffect, useRef, useState } from "react";
import { useTama } from "@/lib/tama/store";

// Pixel HUD renders three tiny meters in ink-on-lcd style.
// Each meter briefly glows when its value changes.
export function PixelHUD() {
  const { state } = useTama();
  const { rest, body, spark } = state.wellbeing;
  return (
    <div
      className="flex items-center gap-3 text-[11px] uppercase tracking-widest"
      style={{ color: "var(--color-lcd-ink)", minHeight: 32 }}
    >
      <Meter label="rst" value={rest} />
      <Meter label="bdy" value={body} />
      <Meter label="spk" value={spark} />
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const [glow, setGlow] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (Math.abs(value - prev.current) > 0.5) {
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 900);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  const cells = 8;
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * cells);
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${label} ${Math.round(value)}`}
      style={{ minHeight: 32, padding: "6px 2px" }}
    >
      <span style={{ color: "var(--color-lcd-ink)" }}>{label}</span>
      <div
        className="flex gap-[2px]"
        style={{
          filter: glow ? "drop-shadow(0 0 3px currentColor)" : undefined,
          transition: "filter 400ms ease-out",
        }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-2 w-1.5"
            style={{
              background: i < filled ? "currentColor" : "transparent",
              border: "1px solid currentColor",
              opacity: i < filled ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}
