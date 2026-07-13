import { useState } from "react";
import { useTama } from "@/lib/tama/store";

export function MemoryPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch, exportMemory } = useTama();
  const active = state.memory.filter((m) => m.isActive);

  const doExport = () => {
    const blob = new Blob([exportMemory()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.petName.toLowerCase()}-memory.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pet = state.petName.toLowerCase();

  return (
    <PanelShell
      title={`what ${pet} noticed`}
      subtitle={`${pet}'s memory belongs to you.`}
      onClose={onClose}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => dispatch({ type: "toggleConsent", key: "memoryEnabled" })}
          className={`rounded-full border px-3 py-1 text-xs ${
            state.consent.memoryEnabled
              ? "border-orchid/40 bg-orchid/10 text-orchid"
              : "border-charcoal/15 bg-white/60 text-charcoal/60"
          }`}
        >
          memory: {state.consent.memoryEnabled ? "on" : "off"}
        </button>
        <button
          onClick={doExport}
          className="rounded-full border border-charcoal/15 bg-white/60 px-3 py-1 text-xs text-charcoal/70"
        >
          export json
        </button>
        <button
          onClick={() => {
            if (confirm(`delete every inference ${pet} has stored?`)) dispatch({ type: "wipeMemory" });
          }}
          className="rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs text-destructive"
        >
          delete all
        </button>
      </div>

      {active.length === 0 && (
        <p className="rounded-xl border border-dashed border-charcoal/15 p-4 text-sm text-charcoal/60">
          nothing yet. {pet} is listening lightly.
        </p>
      )}

      <div className="space-y-2">
        {active.map((inf) => (
          <InferenceCard key={inf.id} id={inf.id} />
        ))}
      </div>
    </PanelShell>
  );
}

function InferenceCard({ id }: { id: string }) {
  const { state, dispatch } = useTama();
  const inf = state.memory.find((m) => m.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(inf?.statement ?? "");
  if (!inf) return null;

  const confidenceColor =
    inf.confidence === "high"
      ? "bg-lime/50 text-charcoal"
      : inf.confidence === "medium"
        ? "bg-lavender/50 text-charcoal"
        : "bg-charcoal/10 text-charcoal/70";

  return (
    <div className="rounded-xl border border-charcoal/10 bg-white/70 p-3 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded-full bg-charcoal/8 px-2 py-0.5 uppercase tracking-wider text-charcoal/60">
          {inf.category}
        </span>
        <span className={`rounded-full px-2 py-0.5 uppercase tracking-wider ${confidenceColor}`}>
          {inf.confidence}
        </span>
        <span className="ml-auto text-charcoal/50">
          {new Date(inf.sourceDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-charcoal/15 bg-cream/50 p-2 text-sm outline-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="rounded-md px-2 py-1 text-xs text-charcoal/60">
              cancel
            </button>
            <button
              onClick={() => {
                dispatch({ type: "editMemory", id, statement: draft });
                setEditing(false);
              }}
              className="rounded-md bg-orchid px-3 py-1 text-xs text-cream"
            >
              save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-charcoal">{inf.statement}</p>
          {inf.sourceText && (
            <p className="mt-1 text-[11px] italic text-charcoal/50">from: "{inf.sourceText}"</p>
          )}
        </>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!editing && (
          <button
            onClick={() => {
              setDraft(inf.statement);
              setEditing(true);
            }}
            className="rounded-full border border-charcoal/15 px-2.5 py-0.5 text-[11px] text-charcoal/70 hover:bg-charcoal/5"
          >
            edit
          </button>
        )}
        {!inf.userConfirmed && (
          <button
            onClick={() => dispatch({ type: "confirmMemory", id })}
            className="rounded-full border border-lime/40 bg-lime/20 px-2.5 py-0.5 text-[11px] text-charcoal hover:bg-lime/40"
          >
            keep this in mind
          </button>
        )}
        <button
          onClick={() => dispatch({ type: "rejectMemory", id })}
          className="rounded-full border border-charcoal/15 px-2.5 py-0.5 text-[11px] text-charcoal/70 hover:bg-charcoal/5"
        >
          that's not right
        </button>
        <button
          onClick={() => dispatch({ type: "deleteMemory", id })}
          className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
        >
          delete
        </button>
      </div>
    </div>
  );
}

export function PanelShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-charcoal/30 backdrop-blur-sm sm:items-center">
      <div className="animate-tama-fade-in max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-charcoal/10 bg-cream p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
            {subtitle && <p className="text-xs text-charcoal/60">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-charcoal/15 px-3 py-1 text-xs text-charcoal/70"
          >
            close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
