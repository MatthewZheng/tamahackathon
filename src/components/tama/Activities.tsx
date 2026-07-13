import { useEffect, useRef, useState } from "react";
import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";

export function ActivityOverlay() {
  const { state } = useTama();
  if (!state.activity) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
      <div className="animate-tama-fade-in w-full max-w-md rounded-3xl border border-charcoal/10 bg-cream p-6 shadow-2xl">
        {state.activity === "breathe" && <BreathingWithPocket />}
        {state.activity === "sit" && <SitStillWithPocket />}
        {state.activity === "water" && <WaterWithPocket />}
      </div>
    </div>
  );
}

function ActivityFeedback() {
  const { dispatch } = useTama();
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <button
        onClick={() => dispatch({ type: "activityFeedback", feedback: "yes" })}
        className="rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream"
      >
        that helped
      </button>
      <button
        onClick={() => dispatch({ type: "activityFeedback", feedback: "no" })}
        className="rounded-full border border-charcoal/15 px-4 py-2 text-sm"
      >
        not really
      </button>
      <button
        onClick={() => dispatch({ type: "activityFeedback", feedback: "other" })}
        className="rounded-full border border-charcoal/15 px-4 py-2 text-sm"
      >
        try something else
      </button>
    </div>
  );
}

function BreathingWithPocket() {
  const { state, dispatch } = useTama();
  const [phase, setPhase] = useState<"idle" | "in" | "hold" | "out" | "done">("idle");
  const [running, setRunning] = useState(false);
  const [demo, setDemo] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const step = (next: "in" | "hold" | "out" | "done", ms: number) => {
    timerRef.current = window.setTimeout(() => {
      setPhase(next);
      if (next === "in") step("hold", demo ? 1400 : 4000);
      else if (next === "hold") step("out", demo ? 2200 : 7000);
      else if (next === "out") step("done", demo ? 2400 : 8000);
    }, ms);
  };

  const start = (demoMode = false) => {
    setDemo(demoMode);
    setRunning(true);
    setPhase("in");
    step("hold", demoMode ? 1400 : 4000);
  };

  const pause = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setRunning(false);
    setPhase("idle");
  };

  const label =
    phase === "in"
      ? "breathe in…"
      : phase === "hold"
        ? "hold…"
        : phase === "out"
          ? "breathe out…"
          : phase === "done"
            ? "the room got a little quieter."
            : "breathing with pocket";

  const scale = phase === "in" ? 1.35 : phase === "hold" ? 1.35 : phase === "out" ? 0.9 : 1;

  return (
    <div className="text-center">
      <h3 className="mb-1 text-lg font-semibold text-charcoal">breathing with pocket</h3>
      <p className="mb-4 text-sm text-charcoal/60">4 · 7 · 8 · one gentle cycle</p>
      <div
        className="lcd-screen scanlines scanlines-after mx-auto flex aspect-square w-56 items-center justify-center overflow-hidden rounded-2xl"
        style={{ filter: phase !== "idle" && phase !== "done" ? "brightness(0.9)" : "none" }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transition: state.consent.reducedMotion
              ? "transform 200ms linear"
              : phase === "in"
                ? "transform 4000ms ease-in-out"
                : phase === "out"
                  ? "transform 8000ms ease-in-out"
                  : "transform 500ms ease",
          }}
        >
          <PocketSprite state="idle" size={120} reducedMotion={state.consent.reducedMotion} />
        </div>
      </div>
      <p className="mt-3 min-h-6 text-sm italic text-charcoal/70">{label}</p>

      {phase === "done" ? (
        <ActivityFeedback />
      ) : (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!running && (
            <>
              <button
                onClick={() => start(false)}
                className="rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream"
              >
                start
              </button>
              <button
                onClick={() => start(true)}
                className="rounded-full border border-charcoal/15 px-4 py-2 text-sm"
              >
                complete demo
              </button>
            </>
          )}
          {running && (
            <button
              onClick={pause}
              className="rounded-full border border-charcoal/15 px-4 py-2 text-sm"
            >
              pause
            </button>
          )}
          <button
            onClick={() => dispatch({ type: "closeActivity" })}
            className="rounded-full px-4 py-2 text-sm text-charcoal/60"
          >
            exit
          </button>
        </div>
      )}
    </div>
  );
}

function SitStillWithPocket() {
  const { state, dispatch } = useTama();
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  const start = (demo = false) => {
    setSeconds(demo ? 5 : 60);
    setRunning(true);
    setDone(false);
    const startAt = Date.now();
    const total = demo ? 5000 : 60000;
    const tick = () => {
      const elapsed = Date.now() - startAt;
      const left = Math.max(0, Math.ceil((total - elapsed) / 1000));
      setSeconds(left);
      if (elapsed >= total) {
        setRunning(false);
        setDone(true);
        return;
      }
      timer.current = window.setTimeout(tick, 250);
    };
    tick();
  };

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <div className="text-center">
      <h3 className="mb-1 text-lg font-semibold text-charcoal">sit still with pocket</h3>
      <p className="mb-4 text-sm text-charcoal/60">no score. no streak.</p>
      <div className="lcd-screen scanlines scanlines-after mx-auto flex aspect-square w-56 items-center justify-center overflow-hidden rounded-2xl" style={{ filter: running ? "brightness(0.85)" : "none" }}>
        <PocketSprite state="sleepy" size={120} reducedMotion={state.consent.reducedMotion} />
      </div>
      <p className="mt-3 font-mono text-2xl text-charcoal">
        {done ? "nothing happened. that was the point." : `${seconds}s`}
      </p>

      {done ? (
        <ActivityFeedback />
      ) : (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!running && (
            <>
              <button onClick={() => start(false)} className="rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream">
                stay for a minute
              </button>
              <button onClick={() => start(true)} className="rounded-full border border-charcoal/15 px-4 py-2 text-sm">
                complete demo (5s)
              </button>
            </>
          )}
          <button
            onClick={() => dispatch({ type: "closeActivity" })}
            className="rounded-full px-4 py-2 text-sm text-charcoal/60"
          >
            exit
          </button>
        </div>
      )}
    </div>
  );
}

function WaterWithPocket() {
  const { state, dispatch } = useTama();
  const [stage, setStage] = useState<"ask" | "waiting" | "drinking" | "done">("ask");

  return (
    <div className="text-center">
      <h3 className="mb-1 text-lg font-semibold text-charcoal">one small thing</h3>
      <p className="mb-4 text-sm text-charcoal/60">pocket only drinks what you drink.</p>
      <div className="lcd-screen scanlines scanlines-after mx-auto flex aspect-square w-56 items-center justify-center overflow-hidden rounded-2xl">
        <PocketSprite
          state={stage === "drinking" ? "perked" : stage === "done" ? "celebrating" : "idle"}
          size={120}
          reducedMotion={state.consent.reducedMotion}
        />
      </div>
      <p className="mt-3 min-h-6 text-sm italic text-charcoal/70">
        {stage === "ask" && "can you get me some water?"}
        {stage === "waiting" && "i'll wait right here."}
        {stage === "drinking" && "clink. together."}
        {stage === "done" && "excellent. hydration before philosophy."}
      </p>

      {stage === "done" ? (
        <ActivityFeedback />
      ) : (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {stage === "ask" && (
            <button onClick={() => setStage("waiting")} className="rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream">
              get water
            </button>
          )}
          {stage === "waiting" && (
            <button onClick={() => setStage("drinking")} className="rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream">
              i'm back
            </button>
          )}
          {stage === "drinking" && (
            <button
              onClick={() => setStage("done")}
              className="rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream"
            >
              we drank
            </button>
          )}
          <button
            onClick={() => dispatch({ type: "closeActivity" })}
            className="rounded-full px-4 py-2 text-sm text-charcoal/60"
          >
            exit
          </button>
        </div>
      )}
    </div>
  );
}
