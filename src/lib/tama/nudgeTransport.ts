// Governed pet-to-pet nudge transport.
//
// Three transports (client seam):
//   0. "local"    — same-browser-profile testing via BroadcastChannel
//                   (see localTransport.ts). Active whenever the tab was
//                   loaded with `?as=a`/`?as=b`. Tried first and, when active,
//                   exclusively — it's for local two-window testing, not a
//                   fallback layer for the other two.
//   1. "band"     — REAL Band platform. Server functions in band.functions.ts
//                   post messages into a shared chat room using two provisioned
//                   agent identities (one per pet slot). Anything other than
//                   { id, text } is rejected before it ever hits the wire.
//                   Receive side polls Band for new room messages.
//   2. "insforge" — the realtime path (publishNudgeToFriend / subscribeToMyNudges),
//                   used as automatic fallback when Band is not configured or
//                   a call fails.
//
// Band is tried first on send. If it fails we fall back to InsForge realtime.
// Recipients subscribe to InsForge realtime AND poll Band; whichever delivers
// first wins and its label surfaces as `lastNudgeTransport` (demo-panel badge).

import { petSignalService } from "./services";
import { publishNudgeToFriend } from "./insforgePublish";
import { subscribeToMyNudges } from "./insforgeRealtime";
import { bandSendNudge, bandPollNudge, bandStatus } from "./band.functions";
import { getLocalSlot, sendLocalSignal, subscribeLocalChannel } from "./localTransport";
import { STORAGE_KEY } from "./constants";

export type TransportLabel = "local" | "band" | "insforge";
export type NudgeKind = "nudge" | "hello" | "visit" | "leave";
export type NudgePayload = { id: string; text: string; kind: NudgeKind };

const MAX_TEXT = 240;
const POLL_MS = 8000;
const NUDGE_KINDS: NudgeKind[] = ["nudge", "hello", "visit", "leave"];

// -------- policy gate (both send + receive; matches server enforcement) --------
function policyCheck(payload: unknown): payload is NudgePayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  const keys = Object.keys(p);
  if (keys.length !== 3 || !keys.includes("id") || !keys.includes("text") || !keys.includes("kind"))
    return false;
  if (typeof p.id !== "string" || typeof p.text !== "string") return false;
  if (p.text.length === 0 || p.text.length > MAX_TEXT) return false;
  if (typeof p.kind !== "string" || !NUDGE_KINDS.includes(p.kind as NudgeKind)) return false;
  return true;
}

// -------- config: which band slot this device represents --------
// Symmetrical two-slot deployment: your device is "a" or "b"; friend is the
// other. Persisted in localStorage so demo tabs can pick opposite slots.
export type BandSlot = "a" | "b";
const SLOT_KEY = "tama.bandSlot";
const ROOM_KEY = "tama.bandRoomId";

export function getBandSlot(): BandSlot {
  try {
    const v = localStorage.getItem(SLOT_KEY);
    return v === "b" ? "b" : "a";
  } catch {
    return "a";
  }
}
export function setBandSlot(slot: BandSlot) {
  try {
    localStorage.setItem(SLOT_KEY, slot);
    // Slot change invalidates any prior room.
    localStorage.removeItem(ROOM_KEY);
  } catch {
    /* ignore */
  }
}
function getBandRoom(): string | null {
  try {
    return localStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}
function setBandRoom(id: string | null) {
  try {
    if (id) localStorage.setItem(ROOM_KEY, id);
    else localStorage.removeItem(ROOM_KEY);
  } catch {
    /* ignore */
  }
}

// -------- band availability --------
let bandDisabled = false;
let bandConfiguredCache: boolean | null = null;
export function setBandDisabled(v: boolean) {
  bandDisabled = v;
}
export async function isBandConfigured(): Promise<boolean> {
  if (bandConfiguredCache !== null) return bandConfiguredCache;
  try {
    const s = await bandStatus();
    bandConfiguredCache = s.aConfigured && s.bConfigured;
    return bandConfiguredCache;
  } catch {
    bandConfiguredCache = false;
    return false;
  }
}
export function isBandAvailable() {
  return !bandDisabled;
}

// -------- send --------
function petSignalsConsentAllowed(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    const slot = getLocalSlot();
    const key = slot ? `${STORAGE_KEY}.${slot}` : STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { consent?: { petSignalsEnabled?: boolean } };
    return parsed?.consent?.petSignalsEnabled !== false;
  } catch {
    return true;
  }
}

export async function sendNudge(
  myId: string,
  friendId: string,
  userName: string,
  kind: NudgeKind = "nudge",
): Promise<{ ok: boolean; via: TransportLabel | null }> {
  // Belt-and-braces consent gate: no signal is built or published while the
  // consent toggle is off, regardless of caller.
  if (!petSignalsConsentAllowed()) return { ok: false, via: null };

  const text = petSignalService.translateForFriend(kind, userName);
  const payload: NudgePayload = {
    id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    text,
    kind,
  };
  // Local policy gate — the server fn also enforces this.
  if (!policyCheck(payload)) return { ok: false, via: null };

  // 0. Local same-profile transport (two-window testing). Exclusive when
  // active — don't also hit Band/InsForge in this mode.
  const localSlot = getLocalSlot();
  if (localSlot) {
    const ok = sendLocalSignal(localSlot, kind, payload.text);
    return { ok, via: ok ? "local" : null };
  }

  // 1. Try Band.
  if (isBandAvailable() && (await isBandConfigured())) {
    try {
      const mySlot = getBandSlot();
      const friendSlot: BandSlot = mySlot === "a" ? "b" : "a";
      const roomId = getBandRoom();
      const r = await bandSendNudge({
        data: {
          senderSlot: mySlot,
          receiverSlot: friendSlot,
          roomId,
          nudgeId: payload.id,
          text: payload.text,
          kind: payload.kind,
        },
      });
      if (r.ok) {
        setBandRoom(r.roomId);
        return { ok: true, via: "band" };
      }
    } catch (err) {
      console.warn("[nudge] band send failed:", err);
    }
  }

  // 2. Fall back to InsForge realtime.
  const r = await publishNudgeToFriend(friendId, userName, kind);
  return { ok: r.ok, via: r.ok ? "insforge" : null };
}

// -------- subscribe (dedupe across transports) --------
export async function subscribeNudges(
  myId: string,
  friendId: string | null,
  onNudge: (n: NudgePayload, via: TransportLabel) => void,
): Promise<() => void> {
  const seen = new Set<string>();
  const deliver = (raw: unknown, via: TransportLabel) => {
    let payload: NudgePayload | null = null;
    if (policyCheck(raw)) {
      payload = raw;
    } else if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as { text?: unknown }).text === "string"
    ) {
      // InsForge path carries { text, kind }; wrap with synthetic id for dedupe.
      const text = (raw as { text: string }).text;
      const rawKind = (raw as { kind?: unknown }).kind;
      const kind: NudgeKind = NUDGE_KINDS.includes(rawKind as NudgeKind)
        ? (rawKind as NudgeKind)
        : "nudge";
      const wrapped = {
        id: `if_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        text,
        kind,
      };
      if (policyCheck(wrapped)) payload = wrapped;
    }
    if (!payload) return; // policy rejects
    if (seen.has(payload.id)) return;
    seen.add(payload.id);
    onNudge(payload, via);
  };

  // Local same-profile transport (two-window testing) — exclusive when active.
  const localSlot = getLocalSlot();
  if (localSlot) {
    const unsubLocal = subscribeLocalChannel(localSlot, {
      onPresence: () => {
        /* handled separately by the store, which also wants userName/petName */
      },
      onSignal: (s) => deliver({ id: s.id, text: s.text, kind: s.kind }, "local"),
    });
    return unsubLocal;
  }

  // Band polling loop. Runs whenever band is configured; a room may not yet
  // exist for this device — the loop stays cheap and starts working the moment
  // a friend sends the first message (their send creates+shares the room).
  let bandTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  const startBandPoll = async () => {
    if (!isBandAvailable()) return;
    if (!(await isBandConfigured())) return;
    const mySlot = getBandSlot();
    const tick = async () => {
      if (stopped) return;
      const roomId = getBandRoom();
      if (!roomId) return; // no room yet; sender will bootstrap it
      try {
        const r = await bandPollNudge({ data: { slot: mySlot, roomId } });
        if (r.ok && r.nudge) {
          deliver(r.nudge, "band");
        }
      } catch {
        /* transient errors ignored */
      }
    };
    // Poll immediately then on interval.
    void tick();
    bandTimer = setInterval(() => void tick(), POLL_MS);
  };
  void startBandPoll();

  // InsForge subscription: fallback transport + cross-tab realtime.
  const unsubIf = await subscribeToMyNudges(myId, (n) => deliver(n, "insforge"));

  return () => {
    stopped = true;
    if (bandTimer) clearInterval(bandTimer);
    unsubIf();
  };
}
