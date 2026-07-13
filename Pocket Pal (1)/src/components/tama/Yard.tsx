import { useTama } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";
import { PanelShell } from "./MemoryPanel";
import { petSignalService } from "@/lib/tama/services";

export function Yard({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTama();
  const friendMsgToJamie = state.petSignal
    ? petSignalService.translateForFriend(state.petSignal, state.userName.toLowerCase())
    : null;

  return (
    <PanelShell
      title="the yard"
      subtitle="disclosure without exposure. no private data leaves this device."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <PetCard name={state.petName.toLowerCase()} spriteState={state.spriteState} owner={state.userName} tint={state.spriteTint} />
        <PetCard name={state.friendPetName.toLowerCase()} spriteState="perked" owner={state.friendName} biscuit />
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-charcoal/10 bg-white/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-charcoal/50">
            {state.petName.toLowerCase()} → {state.friendPetName.toLowerCase()} (agent-to-agent)
          </p>
          {state.petSignal ? (
            <p className="text-sm text-charcoal">"{state.petSignal.text}"</p>
          ) : (
            <p className="text-sm italic text-charcoal/60">no signal sent.</p>
          )}
          <button
            onClick={() => dispatch({ type: "sendPetSignal" })}
            className="mt-2 rounded-full bg-orchid px-3 py-1 text-xs font-medium text-cream"
          >
            simulate {state.petName.toLowerCase()} → {state.friendPetName.toLowerCase()}
          </button>
        </div>

        <div className="rounded-xl border border-charcoal/10 bg-white/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-charcoal/50">
            what {state.friendName.toLowerCase()} would see
          </p>
          <p className="text-sm text-charcoal">
            {friendMsgToJamie ?? `nothing until ${state.petName.toLowerCase()} sends a signal.`}
          </p>
          <p className="mt-1 text-[11px] italic text-charcoal/50">
            never: your messages, moods, meters, or memory.
          </p>
        </div>


        <div className="rounded-xl border border-charcoal/10 bg-white/60 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-charcoal/50">incoming</p>
              <p className="text-sm text-charcoal">
                {state.friendNudge
                  ? state.friendNudge.resolved
                    ? "you already responded."
                    : `someone's thinking about you.`
                  : "nothing yet."}
              </p>
            </div>
            {!state.friendNudge && (
              <button
                onClick={() => dispatch({ type: "receiveFriendNudge" })}
                className="rounded-full border border-charcoal/15 px-3 py-1 text-xs"
              >
                simulate nudge
              </button>
            )}
          </div>
          {state.friendNudge && !state.friendNudge.resolved && (
            <>
              <p className="mt-2 rounded-lg bg-lavender/40 p-2 text-sm text-charcoal">
                {state.friendNudge.text}
              </p>
              <p className="mt-2 text-xs italic text-charcoal/60">
                want to text {state.friendName.toLowerCase()} back?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText("thinking of you too. wanna grab coffee?");
                  }}
                  className="rounded-full border border-charcoal/15 px-3 py-1 text-xs"
                >
                  copy message
                </button>
                <button
                  onClick={() => dispatch({ type: "markRealCheckin" })}
                  className="rounded-full bg-lime px-3 py-1 text-xs font-medium text-charcoal"
                >
                  mark real-life check-in complete
                </button>
                <button
                  onClick={() => dispatch({ type: "declineNudge" })}
                  className="rounded-full px-3 py-1 text-xs text-charcoal/60"
                >
                  decline
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-white/60 p-3">
          <div>
            <p className="text-sm text-charcoal">pet signals</p>
            <p className="text-[11px] italic text-charcoal/50">
              minimal. voluntary. only nudges toward real-world contact.
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: "toggleConsent", key: "petSignalsEnabled" })}
            className={`rounded-full border px-3 py-1 text-xs ${
              state.consent.petSignalsEnabled
                ? "border-orchid/40 bg-orchid/10 text-orchid"
                : "border-charcoal/15 bg-cream text-charcoal/60"
            }`}
          >
            {state.consent.petSignalsEnabled ? "on" : "off"}
          </button>
        </div>
      </div>
    </PanelShell>
  );
}

function PetCard({
  name,
  spriteState,
  owner,
  biscuit,
  tint,
}: {
  name: string;
  spriteState: "idle" | "perked" | "sleepy" | "low" | "celebrating";
  owner: string;
  biscuit?: boolean;
  tint?: import("@/lib/tama/store").SpriteTint;
}) {
  return (
    <div className="lcd-screen scanlines scanlines-after relative flex aspect-square items-end justify-center overflow-hidden rounded-2xl">
      <div className="absolute inset-x-4 bottom-8 h-[2px] bg-current opacity-40" />
      <div style={{ filter: biscuit ? "hue-rotate(35deg)" : "none" }}>
        <PocketSprite state={spriteState} size={96} tint={tint} ariaName={name} />
      </div>
      <div className="absolute inset-x-0 top-2 text-center text-[10px] uppercase tracking-widest opacity-70">
        {name} · {owner.toLowerCase()}
      </div>
    </div>
  );
}
