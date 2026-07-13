import { useEffect, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { useTama } from "@/lib/tama/store";

// Minimal shape of the Web Speech API we rely on.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}


const LINE_HEIGHT_PX = 20;
const MAX_ROWS = 2;

export function Conversation() {
  const { state, dispatch } = useTama();
  const [draft, setDraft] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech recognition — detected after mount to avoid SSR/client hydration mismatch
  const [SR, setSR] = useState<SpeechRecognitionCtor | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    setSR(() => getSpeechRecognitionCtor());
    return () => {
      try { recogRef.current?.abort(); } catch { /* noop */ }
    };
  }, []);


  const rec = state.pendingRecommendation;




  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const max = LINE_HEIGHT_PX * MAX_ROWS + 12;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  };

  const send = () => {
    const text = draft.trim();
    if (!text || state.thinking) return;
    dispatch({ type: "sayMore", text });
    setDraft("");
    requestAnimationFrame(() => autoGrow(textareaRef.current));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    baseTextRef.current = e.target.value;
    autoGrow(e.target);
  };

  const stopListening = () => {
    try { recogRef.current?.stop(); } catch { /* noop */ }
  };

  const startListening = () => {
    if (!SR) return;
    setMicError(null);
    try {
      const r = new SR();
      r.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
      r.interimResults = true;
      r.continuous = true;
      baseTextRef.current = draft ? draft.replace(/\s*$/, "") + (draft ? " " : "") : "";
      r.onresult = (e) => {
        let interim = "";
        let finalAdd = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const chunk = res[0]?.transcript ?? "";
          if (res.isFinal) finalAdd += chunk;
          else interim += chunk;
        }
        if (finalAdd) {
          baseTextRef.current = (baseTextRef.current + finalAdd).replace(/\s+/g, " ");
          if (!baseTextRef.current.endsWith(" ")) baseTextRef.current += " ";
        }
        const next = (baseTextRef.current + interim).trimStart();
        setDraft(next);
        requestAnimationFrame(() => autoGrow(textareaRef.current));
      };
      r.onerror = (ev) => {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed" || ev.error === "denied") {
          setMicError("microphone access is blocked. enable it in your browser settings to use voice.");
        } else if (ev.error === "no-speech") {
          setMicError("didn't catch anything. try again?");
        } else if (ev.error !== "aborted") {
          setMicError("couldn't start voice input.");
        }
      };
      r.onend = () => {
        setListening(false);
        recogRef.current = null;
      };
      recogRef.current = r;
      r.start();
      setListening(true);
    } catch {
      setMicError("couldn't start voice input.");
      setListening(false);
    }
  };

  const toggleMic = () => {
    if (listening) stopListening();
    else startListening();
  };


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

      <div className="flex flex-col gap-1.5 rounded-xl border border-charcoal/10 bg-white/60 p-2.5">
        <label className="text-[11px] text-charcoal/60">or say it your own way</label>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="type only if you want to"
            rows={1}
            disabled={state.thinking}
            className="w-full resize-none overflow-y-auto rounded-lg border border-charcoal/10 bg-cream/60 p-2 text-sm leading-5 text-charcoal outline-none focus:border-orchid disabled:opacity-50"
            style={{ maxHeight: LINE_HEIGHT_PX * MAX_ROWS + 12 }}
          />
          {SR && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={state.thinking}
              aria-pressed={listening}
              aria-label={listening ? "stop voice input" : "start voice input"}
              className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 ${
                listening
                  ? "border-orchid/60 bg-orchid/10 text-orchid"
                  : "border-charcoal/15 bg-white/70 text-charcoal/70 hover:bg-white"
              } ${listening && !state.consent.reducedMotion ? "animate-pulse" : ""}`}
            >
              {listening ? (state.consent.reducedMotion ? "listening…" : "● mic") : "🎤"}
            </button>
          )}
          <button
            onClick={send}
            disabled={!draft.trim() || state.thinking}
            className="shrink-0 rounded-md bg-orchid px-3 py-1.5 text-xs font-medium text-cream hover:opacity-90 disabled:opacity-40"
          >
            send
          </button>
        </div>
        {listening && (
          <p className="text-[10px] italic text-charcoal/50">
            voice is transcribed by your browser's speech service and isn't stored.
          </p>
        )}
        {micError && (
          <p className="text-[11px] text-orchid/80">{micError}</p>
        )}
      </div>


      {rec && !state.showSayMore && (
        <div className="animate-tama-fade-in rounded-xl bg-lavender/30 p-3">
          <p className="mb-2 text-sm text-charcoal">
            {rec === "breathe" && "i'm doing my breaths. want to do them with me?"}
            {rec === "sit" && "i'm going to sit here for a minute. you can stay if you want."}
            {rec === "water" && "can you get me some water? i only drink what you drink."}
            {rec === "celebrate" && "good. let's not rush past that."}
            {rec === "friend" && `want me to see if ${state.friendPetName.toLowerCase()} is around?`}
            {rec === "notice" && "tell me three things you can see. i'm curious."}
            {rec === "sundown" && "what was the least-bad part of today?"}
          </p>
          <div className="flex flex-wrap gap-2">
            {rec === "breathe" && (
              <button
                onClick={() => dispatch({ type: "openActivity", activity: "breathe" })}
                className="rounded-full bg-orchid px-3 py-1 text-xs font-medium text-cream"
              >
                breathe with {state.petName.toLowerCase()}
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
                onClick={() => dispatch({ type: "setScreenView", view: "yard" })}
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
