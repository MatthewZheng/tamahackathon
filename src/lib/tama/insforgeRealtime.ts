// Subscribe to your own nudge channel. Callback fires when a friend's pet
// sends a nudge via publishNudgeToFriend().
import { insforge } from "./insforgeClient";
import type { SignalKind } from "./services";

export type IncomingNudge = { text: string; kind?: SignalKind };

const SIGNAL_KINDS: SignalKind[] = ["nudge", "hello", "visit", "leave"];

export async function subscribeToMyNudges(
  userId: string,
  onNudge: (n: IncomingNudge) => void,
): Promise<() => void> {
  const c = insforge();
  if (!c) return () => undefined;
  const channel = `user:${userId}:nudges`;

  const handler = (msg: unknown) => {
    // Defensive: accept only { text: string, kind?: string }. Drop anything else.
    const anyMsg = msg as
      | { payload?: { text?: unknown; kind?: unknown }; text?: unknown; kind?: unknown }
      | undefined;
    const raw = anyMsg?.payload?.text ?? anyMsg?.text;
    const rawKind = anyMsg?.payload?.kind ?? anyMsg?.kind;
    const kind = SIGNAL_KINDS.includes(rawKind as SignalKind) ? (rawKind as SignalKind) : undefined;
    if (typeof raw === "string" && raw.length) onNudge({ text: raw, kind });
  };

  try {
    await c.realtime.connect();
    await c.realtime.subscribe(channel);
    c.realtime.on("nudge", handler);
  } catch {
    /* ignore */
  }

  return () => {
    try {
      c.realtime.off("nudge", handler);
      c.realtime.unsubscribe(channel);
    } catch {
      /* ignore */
    }
  };
}
