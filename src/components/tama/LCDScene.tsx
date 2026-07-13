import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";
import { PixelHUD } from "./PixelHUD";

// Web Speech (browser-native)
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

// Tiny "blip" via Web Audio; silent unless soundEnabled.
function playBlip(kind: "send" | "perk" | "celebrate") {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    const start =
      kind === "send" ? 660 : kind === "perk" ? 880 : 1040;
    o.frequency.setValueAtTime(start, ctx.currentTime);
    if (kind === "celebrate") {
      o.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.15);
    }
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  } catch {
    /* noop */
  }
}

// Subtle time-of-day filter over the LCD screen.
function timeShade(): { filter?: string; label: string } {
  if (typeof Date === "undefined") return { label: "day" };
  const h = new Date().getHours();
  if (h < 6) return { filter: "saturate(0.85) brightness(0.92) hue-rotate(-8deg)", label: "night" };
  if (h < 10) return { filter: "saturate(1.05) brightness(1.03) hue-rotate(6deg)", label: "morning" };
  if (h < 18) return { filter: undefined, label: "day" };
  if (h < 21) return { filter: "saturate(0.95) brightness(0.98) hue-rotate(-4deg)", label: "evening" };
  return { filter: "saturate(0.85) brightness(0.92) hue-rotate(-8deg)", label: "night" };
}

const LINE_HEIGHT_PX = 22;
const MAX_ROWS = 2;

// LCDScene — the inside of the retro device screen. Contains HUD, dialogue,
// options, sprite, and the input row. This is the single interactive surface.
export function LCDScene() {
  const { state, dispatch } = useTama();
  const { spriteState, consent, currentPrompt } = state;
  const reduced = consent.reducedMotion;
  const pet = state.petName.toLowerCase();

  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech recognition
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

  // Sound on state transitions
  const lastSprite = useRef(spriteState);
  useEffect(() => {
    if (lastSprite.current !== spriteState) {
      if (consent.soundEnabled) {
        if (spriteState === "celebrating") playBlip("celebrate");
        else if (spriteState === "perked") playBlip("perk");
      }
      lastSprite.current = spriteState;
    }
  }, [spriteState, consent.soundEnabled]);

  const lastPocket = [...state.conversation].reverse().find((m) => m.from === "pocket");
  const displayMessage = lastPocket?.text ?? currentPrompt.question;

  const shade = useMemo(() => timeShade(), []);

  const posture: "normal" | "attentive" | "listening" =
    listening ? "listening" : (focused || typing) ? "attentive" : "normal";

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const max = LINE_HEIGHT_PX * MAX_ROWS + 12;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  };

  const send = () => {
    const text = draft.trim();
    if (!text || state.thinking) return;
    if (consent.soundEnabled) playBlip("send");
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
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 900);
  };

  const stopListening = () => { try { recogRef.current?.stop(); } catch { /* noop */ } };
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
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed" || ev.error === "denied")
          setMicError("microphone blocked. enable it in browser settings.");
        else if (ev.error === "no-speech") setMicError("didn't catch anything. try again?");
        else if (ev.error !== "aborted") setMicError("couldn't start voice input.");
      };
      r.onend = () => { setListening(false); recogRef.current = null; };
      recogRef.current = r;
      r.start();
      setListening(true);
    } catch {
      setMicError("couldn't start voice input.");
      setListening(false);
    }
  };
  const toggleMic = () => (listening ? stopListening() : startListening());

  return (
    <div
      className="lcd-screen scanlines scanlines-after relative flex aspect-[5/4] w-full flex-col overflow-hidden rounded-2xl px-3 pb-2 pt-2"
      style={{ filter: reduced ? undefined : shade.filter, color: "var(--color-lcd-ink)" }}
    >
      <div className="absolute inset-0 pixel-grid opacity-10" />
      {/* floor */}
      <div className="pointer-events-none absolute inset-x-4 bottom-[46%] h-[2px] bg-current opacity-30" />
      {/* sun/moon indicator */}
      <div
        className="pointer-events-none absolute right-3 top-2 h-2.5 w-2.5 rounded-full border-2 border-current"
        style={{ color: "var(--color-lcd-ink-soft)" }}
        title={shade.label}
      />

      {/* HUD */}
      <div className="relative z-10">
        <PixelHUD />
      </div>

      {/* Message balloon */}
      <div
        className="relative z-10 mt-1 rounded-lg border-2 bg-lcd-dim/50 px-2 py-1.5"
        style={{ borderColor: "var(--color-lcd-ink)" }}
        aria-live="polite"
      >
        <p className="text-[17px] leading-tight" style={{ fontFamily: "var(--font-mono-lcd)", color: "var(--color-lcd-ink)" }}>
          {displayMessage}
        </p>
      </div>

      {/* Sprite */}
      <div className="relative z-0 flex flex-1 items-end justify-center pb-1">
        <div
          className={reduced ? "" : "tama-wander"}
          style={{ transformOrigin: "center bottom" }}
        >
          <PocketSprite
            state={spriteState}
            size={112}
            reducedMotion={reduced}
            thinking={state.thinking}
            tint={state.spriteTint}
            species={state.spriteSpecies}
            posture={posture}
            ariaName={pet}
            stage={state.evolutionStage}
          />
        </div>
      </div>

      {/* Option chips */}
      <div className="relative z-10 mb-1.5 flex flex-wrap justify-center gap-1.5 text-[12px]">
        {currentPrompt.options.map((opt, i) => (
          <button
            key={i}
            disabled={state.thinking}
            onClick={() =>
              dispatch({
                type: "quickAnswer",
                key: (["A", "B", "C"] as const)[i],
                label: opt,
              })
            }
            className="rounded-md border-2 bg-lcd-dim/50 uppercase tracking-wide hover:bg-lcd-dim/80 active:translate-y-[1px] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              fontFamily: "var(--font-mono-lcd)",
              color: "var(--color-lcd-ink)",
              borderColor: "var(--color-lcd-ink)",
              minHeight: 44,
              padding: "8px 12px",
              outlineColor: "var(--color-lcd-ink)",
            }}
          >
            {(["a", "b", "c"] as const)[i]} · {opt}
          </button>
        ))}
        <button
          onClick={() => dispatch({ type: "advancePrompt" })}
          disabled={state.thinking}
          className="rounded-md border-2 uppercase tracking-wide active:translate-y-[1px] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            fontFamily: "var(--font-mono-lcd)",
            color: "var(--color-lcd-ink)",
            borderColor: "var(--color-lcd-ink)",
            minHeight: 44,
            padding: "8px 12px",
            outlineColor: "var(--color-lcd-ink)",
          }}
        >
          ↻ new
        </button>
      </div>

      {/* Input row — solid, high-contrast dialogue bar */}
      <div
        className="relative z-10 flex items-end gap-1.5 rounded-md bg-lcd-dim/60 px-2 py-1.5"
        style={{ border: "2px solid var(--color-lcd-ink)" }}
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="type or press mic — enter sends"
          rows={1}
          disabled={state.thinking}
          className="tama-lcd-input w-full resize-none bg-transparent leading-[22px] outline-none disabled:opacity-60"
          style={{
            maxHeight: LINE_HEIGHT_PX * MAX_ROWS + 16,
            minHeight: 44,
            fontFamily: "var(--font-mono-lcd)",
            fontSize: 16,
            color: "var(--color-lcd-ink)",
          }}
        />
        {SR && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={state.thinking}
            aria-pressed={listening}
            aria-label={listening ? "stop voice input" : "start voice input"}
            className={`shrink-0 rounded border-2 uppercase tracking-wide active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              listening ? "bg-current/20" : ""
            } ${listening && !reduced ? "animate-pulse" : ""}`}
            style={{
              fontFamily: "var(--font-mono-lcd)",
              fontSize: 12,
              color: "var(--color-lcd-ink)",
              borderColor: "var(--color-lcd-ink)",
              minHeight: 44,
              minWidth: 44,
              padding: "8px 10px",
              outlineColor: "var(--color-lcd-ink)",
            }}
          >
            {listening ? (reduced ? "on" : "●") : "mic"}
          </button>
        )}
        <button
          onClick={send}
          disabled={!draft.trim() || state.thinking}
          className="shrink-0 rounded border-2 bg-current/10 uppercase tracking-wide active:translate-y-[1px] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            fontFamily: "var(--font-mono-lcd)",
            fontSize: 12,
            color: "var(--color-lcd-ink)",
            borderColor: "var(--color-lcd-ink)",
            minHeight: 44,
            minWidth: 44,
            padding: "8px 12px",
            outlineColor: "var(--color-lcd-ink)",
          }}
        >
          send ▸
        </button>
      </div>
      {listening && (
        <p
          className="relative z-10 pt-1 text-[10px] italic"
          style={{ fontFamily: "var(--font-mono-lcd)", color: "var(--color-lcd-ink-soft)" }}
        >
          voice is transcribed by your browser's speech service — audio isn't saved. sent text becomes part of your conversation.
        </p>
      )}
      {micError && (
        <p
          className="relative z-10 pt-1 text-[10px]"
          style={{ fontFamily: "var(--font-mono-lcd)", color: "var(--color-lcd-ink)" }}
        >
          {micError}
        </p>
      )}
    </div>
  );
}

