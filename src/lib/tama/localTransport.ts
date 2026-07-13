// Local, same-browser-profile transport for testing two paired "users" as two
// windows/tabs on localhost with no backend at all. Load the app as
// `?as=a` in one window and `?as=b` in the other — each gets its own
// isolated local pet (see storageService.ts), and BroadcastChannel carries
// presence + signals between them instantly, in-process, same-origin.
//
// This is NOT a substitute for the Band/InsForge transports (those work
// across real devices/accounts) — it only works between tabs in the same
// browser profile pointed at the same dev server.

export type LocalSlot = "a" | "b";

const CHANNEL_NAME = "tama-local-social";

export function getLocalSlot(): LocalSlot | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("as");
  return v === "a" || v === "b" ? v : null;
}

export function otherSlot(slot: LocalSlot): LocalSlot {
  return slot === "a" ? "b" : "a";
}

export type LocalPresence = {
  type: "presence";
  from: LocalSlot;
  userName: string;
  petName: string;
  // True when this presence message is a reply to someone else's announce.
  // BroadcastChannel never replays past messages to a late subscriber, so
  // whichever window loads first would never hear the second window's
  // initial announce — the reply closes that gap without an infinite
  // back-and-forth (a reply never triggers another reply).
  ack?: boolean;
};

export type LocalSignal = {
  type: "signal";
  from: LocalSlot;
  id: string;
  text: string;
  kind: "nudge" | "hello" | "visit" | "leave";
};

type LocalMessage = LocalPresence | LocalSignal;

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function announcePresence(
  mySlot: LocalSlot,
  userName: string,
  petName: string,
  ack = false,
) {
  const ch = getChannel();
  if (!ch) return;
  const msg: LocalPresence = { type: "presence", from: mySlot, userName, petName, ack };
  ch.postMessage(msg);
}

export function sendLocalSignal(
  mySlot: LocalSlot,
  kind: "nudge" | "hello" | "visit" | "leave",
  text: string,
): boolean {
  const ch = getChannel();
  if (!ch) return false;
  const msg: LocalSignal = {
    type: "signal",
    from: mySlot,
    id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    text,
    kind,
  };
  ch.postMessage(msg);
  return true;
}

export function subscribeLocalChannel(
  mySlot: LocalSlot,
  handlers: {
    onPresence: (p: LocalPresence) => void;
    onSignal: (s: LocalSignal) => void;
  },
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (e: MessageEvent<LocalMessage>) => {
    const m = e.data;
    if (!m || m.from === mySlot) return; // ignore our own broadcasts
    if (m.type === "presence") handlers.onPresence(m);
    else if (m.type === "signal") handlers.onSignal(m);
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
