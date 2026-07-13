import { useTama } from "@/lib/tama/store";

function Bar({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium tracking-wide text-charcoal/70">{label}</span>
        <span className="font-mono text-[11px] text-charcoal/50">{Math.round(value)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-charcoal/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: tint }}
        />
      </div>
    </div>
  );
}

export function Meters() {
  const { state } = useTama();
  const { rest, body, spark } = state.wellbeing;
  return (
    <div className="rounded-2xl border border-charcoal/10 bg-cream/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-charcoal">
          pocket's best guess
        </h3>
        <span className="text-[10px] italic text-charcoal/50">i may be reading this wrong</span>
      </div>
      <div className="space-y-3">
        <Bar label="rest" value={rest} tint="linear-gradient(90deg,var(--color-lavender),var(--color-orchid))" />
        <Bar label="body" value={body} tint="linear-gradient(90deg,var(--color-gold),var(--color-lime))" />
        <Bar label="spark" value={spark} tint="linear-gradient(90deg,var(--color-lime),var(--color-orchid))" />
      </div>
    </div>
  );
}
