import { useEffect, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function PipOverlay({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTama();
  const pet = state.petName.toLowerCase();
  const lastPocket = [...state.conversation].reverse().find((m) => m.from === "pocket");
  const message = lastPocket?.text ?? state.currentPrompt.question;

  const [draft, setDraft] = useState("");
  const [SR, setSR] = useState<SpeechRecognitionCtor | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    setSR(() => getSR());
    return () => {
      try { recogRef.current?.abort(); } catch { /* noop */ }
    };
  }, []);

  const send = () => {
    const t = draft.trim();
    if (!t || state.thinking) return;
    dispatch({ type: "sayMore", text: t });
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    baseRef.current = e.target.value;
  };

  const toggleMic = () => {
    if (!SR) return;
    if (listening) {
      try { recogRef.current?.stop(); } catch { /* noop */ }
      return;
    }
    setMicError(null);
    try {
      const r = new SR();
      r.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
      r.interimResults = true;
      r.continuous = true;
      baseRef.current = draft ? draft.replace(/\s*$/, "") + " " : "";
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
          baseRef.current = (baseRef.current + finalAdd).replace(/\s+/g, " ");
          if (!baseRef.current.endsWith(" ")) baseRef.current += " ";
        }
        setDraft((baseRef.current + interim).trimStart());
      };
      r.onerror = (ev) => {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed" || ev.error === "denied") {
          setMicError("microphone access is blocked.");
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
    }
  };

  // Crisis view — hides playful UI entirely.
  if (state.crisis.active) {
    return (
      <div className={`shell-${state.shellTheme} flex h-full w-full flex-col justify-center gap-3 bg-cream p-4`}>
        <h2 className="text-lg font-semibold text-charcoal">a real person can help.</h2>
        <p className="text-xs text-charcoal/80">
          the full support screen is open in your main tama window.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href="tel:988"
            className="rounded-xl bg-orchid px-4 py-3 text-center text-sm font-semibold text-cream"
          >
            Call 988
          </a>
          <a
            href="sms:988"
            className="rounded-xl border border-orchid/40 bg-orchid/10 px-4 py-3 text-center text-sm font-semibold text-orchid"
          >
            Text 988
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`shell-${state.shellTheme} overlay-shape-${state.overlayShape} flex h-full w-full flex-col gap-2 bg-cream p-3`}>
      <div className="flex items-start gap-2">
        <div className="lcd-screen scanlines scanlines-after flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">

          <PocketSprite
            state={state.spriteState}
            size={40}
            reducedMotion={state.consent.reducedMotion}
            thinking={state.thinking}
            tint={state.spriteTint}
            species={state.spriteSpecies}
            ariaName={pet}
            stage={state.evolutionStage}
          />
        </div>
        <p className="line-clamp-1 flex-1 text-xs text-charcoal/80">{message}</p>
        <button
          onClick={onClose}
          aria-label="close pop-out"
          className="rounded-full bg-white/70 px-2 text-xs text-charcoal/60 hover:bg-white"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {state.currentPrompt.options.map((opt, i) => {
          const k = (["A", "B", "C"] as const)[i];
          return (
            <button
              key={i}
              disabled={state.thinking}
              onClick={() => dispatch({ type: "quickAnswer", key: k, label: opt })}
              className="truncate rounded-md border border-charcoal/10 bg-white/70 px-1.5 py-1 text-[10px] font-medium text-charcoal/80 disabled:opacity-40"
              title={opt}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-1.5">
        <textarea
          value={draft}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="type only if you want to"
          rows={1}
          disabled={state.thinking}
          className="w-full resize-none rounded-md border border-charcoal/10 bg-white/70 p-1.5 text-xs leading-snug text-charcoal outline-none focus:border-orchid disabled:opacity-40"
        />
        {SR && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={state.thinking}
            aria-pressed={listening}
            aria-label={listening ? "stop voice input" : "start voice input"}
            className={`shrink-0 rounded-md border px-1.5 py-1 text-[10px] font-medium ${
              listening
                ? "border-orchid/60 bg-orchid/10 text-orchid"
                : "border-charcoal/15 bg-white/70 text-charcoal/70"
            } ${listening && !state.consent.reducedMotion ? "animate-pulse" : ""}`}
          >
            {listening ? (state.consent.reducedMotion ? "…" : "●") : "🎤"}
          </button>
        )}
        <button
          onClick={send}
          disabled={!draft.trim() || state.thinking}
          className="shrink-0 rounded-md bg-orchid px-2 py-1 text-[10px] font-medium text-cream disabled:opacity-40"
        >
          send
        </button>
      </div>
      {micError && <p className="text-[10px] text-orchid/80">{micError}</p>}
      {listening && (
        <p className="text-[10px] italic text-charcoal/60">
          voice is transcribed by your browser's speech service — audio isn't saved. sent text becomes part of your conversation.
        </p>
      )}
    </div>
  );
}
