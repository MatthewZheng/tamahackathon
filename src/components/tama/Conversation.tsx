import { useState } from "react";
import { useTama } from "@/lib/tama/store";

export function Conversation() {
  const { state, dispatch, sendSayMore } = useTama();
  const [draft, setDraft] = useState("");
  const [showActivity, setShowActivity] = useState(false);

  const rec = state.pendingRecommendation;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-cream/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-charcoal">
          conversation
        </h3>
        <span className="text-[10px] italic text-charcoal/50">one question at a time</span>
      </div>

      <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
        {state.conversation.slice(-8).map((m) => (
          <div
            key={m.id}
            className={`animate-tama-fade-in max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.from === "pocket"
                ? "bg-lavender/40 text-charcoal"
                : "ml-auto bg-charcoal/85 text-cream"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {state.showSayMore && (
        <div className="animate-tama-fade-in flex flex-col gap-2 rounded-xl border border-charcoal/10 bg-white/60 p-3">
          <label className="text-xs text-charcoal/60">say more… (optional)</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="type only if you want to"
            rows={2}
            className="w-full resize-none rounded-lg border border-charcoal/10 bg-cream/60 p-2 text-sm text-charcoal outline-none focus:border-orchid"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setDraft("");
                dispatch({ type: "skipSayMore" });
              }}
              className="rounded-md px-3 py-1 text-xs text-charcoal/60 hover:bg-charcoal/5"
            >
              skip
            </button>
            <button
              onClick={() => {
                if (draft.trim()) {
                  sendSayMore(draft.trim());
                  setDraft("");
                }
              }}
              className="rounded-md bg-orchid px-3 py-1 text-xs font-medium text-cream hover:opacity-90"
            >
              send
            </button>
          </div>
        </div>
      )}

      {rec && !state.showSayMore && (
        <div className="animate-tama-fade-in rounded-xl bg-lavender/30 p-3">
          <p className="mb-2 text-sm text-charcoal">
            {rec === "breathe" && "i'm doing my breaths. want to do them with me?"}
            {rec === "sit" && "i'm going to sit here for a minute. you can stay if you want."}
            {rec === "water" && "can you get me some water? i only drink what you drink."}
            {rec === "celebrate" && "good. let's not rush past that."}
            {rec === "friend" && "want me to see if biscuit is around?"}
            {rec === "notice" && "tell me three things you can see. i'm curious."}
            {rec === "sundown" && "what was the least-bad part of today?"}
          </p>
          <div className="flex flex-wrap gap-2">
            {rec === "breathe" && (
              <button
                onClick={() => dispatch({ type: "openActivity", activity: "breathe" })}
                className="rounded-full bg-orchid px-3 py-1 text-xs font-medium text-cream"
              >
                breathe with pocket
              </button>
            )}
            {rec === "sit" && (
              <button
                onClick={() => dispatch({ type: "openActivity", activity: "sit" })}
                className="rounded-full bg-orchid px-3 py-1 text-xs font-medium text-cream"
              >
                sit still
              </button>
            )}
            {rec === "water" && (
              <button
                onClick={() => dispatch({ type: "openActivity", activity: "water" })}
                className="rounded-full bg-orchid px-3 py-1 text-xs font-medium text-cream"
              >
                get water
              </button>
            )}
            {rec === "celebrate" && (
              <button
                onClick={() => setShowActivity(true)}
                className="rounded-full bg-lime px-3 py-1 text-xs font-medium text-charcoal"
              >
                what should we keep?
              </button>
            )}
            {rec === "friend" && (
              <button
                onClick={() => dispatch({ type: "setPanel", panel: "yard" })}
                className="rounded-full bg-orchid px-3 py-1 text-xs font-medium text-cream"
              >
                open yard
              </button>
            )}
            <button
              onClick={() => dispatch({ type: "advancePrompt" })}
              className="rounded-full border border-charcoal/15 px-3 py-1 text-xs text-charcoal/70"
            >
              not now
            </button>
          </div>
        </div>
      )}

      {showActivity && <GoodDayPicker onClose={() => setShowActivity(false)} />}
    </div>
  );
}

function GoodDayPicker({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTama();
  const [note, setNote] = useState("");
  const kinds = [
    "finished something difficult",
    "had a good conversation",
    "felt rested",
    "spent time outside",
    "had fun",
    "felt proud",
    "custom",
  ];
  return (
    <div className="animate-tama-fade-in rounded-xl border border-lime/40 bg-lime/20 p-3">
      <p className="mb-2 text-sm text-charcoal">what part should we keep?</p>
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => {
              if (k === "custom") return;
              dispatch({ type: "addPositiveMemory", kind: k, note: k });
              onClose();
            }}
            className="rounded-full border border-charcoal/15 bg-white/60 px-2.5 py-1 text-xs text-charcoal/80 hover:bg-white"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="something else…"
          className="flex-1 rounded-md border border-charcoal/15 bg-white/60 px-2 py-1 text-xs outline-none"
        />
        <button
          onClick={() => {
            if (!note.trim()) return;
            dispatch({ type: "addPositiveMemory", kind: "custom", note: note.trim() });
            onClose();
          }}
          className="rounded-md bg-orchid px-3 py-1 text-xs font-medium text-cream"
        >
          keep
        </button>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-charcoal/60">
          close
        </button>
      </div>
    </div>
  );
}
