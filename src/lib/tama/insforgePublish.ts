// Nudge publisher. Enforces the privacy rule at the seam: ONLY a generic
// text string (plus a closed-enum signal kind) crosses the wire — never
// meters, mood detail, memories, or message contents. Any input beyond
// `text`/`kind` is ignored.
import { insforge } from "./insforgeClient";
import { petSignalService, type SignalKind } from "./services";

export async function publishNudgeToFriend(
  friendId: string,
  userName: string,
  kind: SignalKind = "nudge",
): Promise<{ ok: boolean }> {
  const c = insforge();
  if (!c) return { ok: false };

  // Build the generic text via the sanctioned translator. This is the ONLY
  // string that ever crosses the wire.
  const text = petSignalService.translateForFriend(kind, userName);

  // Whitelist: strictly { text, kind }. Never spread other objects into this payload.
  const payload = { text, kind };

  try {
    await c.realtime.connect();
    await c.realtime.publish(`user:${friendId}:nudges`, "nudge", payload);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
