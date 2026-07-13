import { useEffect } from "react";
import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";
import { sendNudge } from "@/lib/tama/nudgeTransport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VISIT_DURATION_MS = 45_000;

// Home spots and the "next to the other pet" landing spots, as a percentage
// of the scene width. The traveling pet's `left` transitions between them —
// real movement across the space, not a fade-in-place.
const HOST_HOME = 20;
const FRIEND_HOME = 80;
const HOST_VISIT = 62; // you, walking over to sit next to the friend's home spot
const FRIEND_VISIT = 38; // friend, walking over to sit next to your home spot

// YardScene lives inside the device's LCD screen, in place of LCDScene, while
// state.screenView === "yard". Same physical screen, different content —
// there is no separate popup/modal.
export function YardScene() {
  const { state, dispatch } = useTama();
  const paired = state.pairedFriend;
  const friendDisplayName = paired?.userName ?? state.friendName;
  const friendPetDisplayName = paired?.petName ?? state.friendPetName;
  const visiting = state.visiting;
  const reduced = state.consent.reducedMotion;

  useEffect(() => {
    if (!visiting) return;
    const t = setTimeout(() => dispatch({ type: "endVisit" }), VISIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [visiting, dispatch]);

  const sendSignal = async (kind: "nudge" | "hello") => {
    dispatch({ type: "sendPetSignal", kind });
    if (paired) {
      const r = await sendNudge(state.account.userId ?? "local", paired.id, state.userName, kind);
      if (r.via) dispatch({ type: "setNudgeTransport", via: r.via });
    }
  };

  const goVisit = async () => {
    dispatch({ type: "goVisit" });
    if (paired) {
      const r = await sendNudge(
        state.account.userId ?? "local",
        paired.id,
        state.userName,
        "visit",
      );
      if (r.via) dispatch({ type: "setNudgeTransport", via: r.via });
    }
  };

  const goHome = async () => {
    dispatch({ type: "endVisit" });
    if (paired) {
      const r = await sendNudge(
        state.account.userId ?? "local",
        paired.id,
        state.userName,
        "leave",
      );
      if (r.via) dispatch({ type: "setNudgeTransport", via: r.via });
    }
  };

  const hostLeft = visiting?.direction === "outgoing" ? HOST_VISIT : HOST_HOME;
  const friendLeft = visiting?.direction === "incoming" ? FRIEND_VISIT : FRIEND_HOME;
  const moveTransition = reduced ? "none" : "left 1100ms ease-in-out";

  return (
    <div
      className="lcd-screen scanlines scanlines-after relative flex w-full flex-col overflow-hidden rounded-2xl px-3 pb-2 pt-2"
      style={{ minHeight: 380, color: "var(--color-lcd-ink)" }}
    >
      <div className="absolute inset-0 pixel-grid opacity-10" />

      {/* header */}
      <div className="relative z-10 flex items-center justify-between text-[10px] uppercase tracking-widest opacity-70">
        <span>the yard</span>
        <span>
          {paired ? `paired with ${friendDisplayName.toLowerCase()}` : "waiting for a friend…"}
        </span>
      </div>

      {/* shared scene — both pets, real cross-space travel on visit */}
      <div className="relative z-0 mt-1 min-h-[150px] flex-1">
        <div className="pointer-events-none absolute inset-x-2 bottom-9 h-[2px] bg-current opacity-30" />

        <div
          className="absolute bottom-2 flex flex-col items-center gap-0.5"
          style={{
            left: `${hostLeft}%`,
            transform: "translateX(-50%)",
            transition: moveTransition,
          }}
        >
          <PocketSprite
            state={state.spriteState}
            size={64}
            tint={state.spriteTint}
            species={state.spriteSpecies}
            reducedMotion={reduced}
            ariaName={state.petName}
            stage={state.evolutionStage}
          />
          <span className="text-[9px] uppercase tracking-widest opacity-70">
            {state.petName.toLowerCase()}
          </span>
          {visiting?.direction === "outgoing" && (
            <span className="text-[9px] italic opacity-80">
              visiting {friendPetDisplayName.toLowerCase()}
            </span>
          )}
        </div>

        <div
          className="absolute bottom-2 flex flex-col items-center gap-0.5"
          style={{
            left: `${friendLeft}%`,
            transform: "translateX(-50%)",
            transition: moveTransition,
          }}
        >
          <PocketSprite
            state="perked"
            size={64}
            tint={paired?.spriteTint as import("@/lib/tama/store").SpriteTint | undefined}
            reducedMotion={reduced}
            ariaName={friendPetDisplayName}
          />
          <span className="text-[9px] uppercase tracking-widest opacity-70">
            {friendPetDisplayName.toLowerCase()}
          </span>
          {visiting?.direction === "incoming" && (
            <span className="text-[9px] italic opacity-80">visiting!</span>
          )}
        </div>
      </div>

      {/* bubble feed — same shape/alignment as normal conversation bubbles */}
      <div className="relative z-10 mt-1 max-h-20 space-y-1 overflow-y-auto">
        {state.yardLog.length === 0 ? (
          <p className="text-[11px] italic opacity-60">nothing said yet.</p>
        ) : (
          state.yardLog.slice(-4).map((m) => (
            <div
              key={m.id}
              className={`animate-tama-fade-in max-w-[85%] rounded-2xl border-2 border-current px-2.5 py-1 text-[11px] ${
                m.from === "me" ? "ml-auto bg-current/15" : "bg-lcd-dim/60"
              }`}
            >
              {m.text}
            </div>
          ))
        )}
      </div>

      {state.friendNudge && !state.friendNudge.resolved && (
        <div className="relative z-10 mt-1 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => dispatch({ type: "markRealCheckin" })}
            className="rounded border-2 border-current px-2 py-0.5 text-[10px] uppercase tracking-wide"
          >
            real-life check-in
          </button>
          <button
            onClick={() => dispatch({ type: "declineNudge" })}
            className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-60"
          >
            decline
          </button>
        </div>
      )}

      {/* controls */}
      <div className="relative z-10 mt-1.5 flex items-center justify-between gap-2">
        <button
          onClick={() => dispatch({ type: "toggleConsent", key: "petSignalsEnabled" })}
          className="rounded border-2 border-current px-2 py-1 text-[10px] uppercase tracking-wide"
          title="only a short generic phrase is shared — never your messages, moods, meters, or memory."
        >
          signals {state.consent.petSignalsEnabled ? "on" : "off"}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded border-2 border-current bg-current/10 px-3 py-1.5 text-[11px] uppercase tracking-wide">
              send ▸
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void sendSignal("nudge")}>nudge</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void sendSignal("hello")}>say hello</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void goVisit()}>go visit</DropdownMenuItem>
            <DropdownMenuItem
              disabled={visiting?.direction !== "outgoing"}
              onClick={() => void goHome()}
            >
              go home
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
