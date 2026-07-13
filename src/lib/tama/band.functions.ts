import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SlotSchema = z.enum(["a", "b"]);

// Policy gate — SERVER-SIDE enforcement point. Anything that is not a bare
// nudge string is rejected here before it can be posted to Band.
const NudgeTextSchema = z
  .string()
  .min(1)
  .max(240)
  .refine((s) => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s), "control chars");

const KindSchema = z.enum(["nudge", "hello", "visit", "leave"]);

const SendInput = z.object({
  senderSlot: SlotSchema,
  receiverSlot: SlotSchema,
  roomId: z.string().uuid().nullable(),
  nudgeId: z.string().min(1).max(64),
  text: NudgeTextSchema,
  kind: KindSchema.default("nudge"),
});

const PollInput = z.object({
  slot: SlotSchema,
  roomId: z.string().uuid(),
});

// Handle cache lives on globalThis so hot reload / repeated fn invocations
// share it in the worker. Values are agent handles ("owner/slug").
type HandleCache = { a?: string; b?: string; aName?: string; bName?: string };
function handleCache(): HandleCache {
  const g = globalThis as unknown as { __bandHandles?: HandleCache };
  if (!g.__bandHandles) g.__bandHandles = {};
  return g.__bandHandles;
}

export const bandSendNudge = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => SendInput.parse(v))
  .handler(async ({ data }) => {
    const { senderSlot, receiverSlot, roomId, text, nudgeId, kind } = data;
    if (senderSlot === receiverSlot) {
      return { ok: false as const, reason: "same-slot" };
    }
    const band = await import("./band.server");
    const sender = band.readBandAgent(senderSlot);
    const receiver = band.readBandAgent(receiverSlot);
    if (!sender || !receiver) {
      return { ok: false as const, reason: "not-configured" };
    }
    try {
      const cache = handleCache();
      const receiverKey = receiverSlot === "a" ? "a" : "b";
      if (!cache[receiverKey]) {
        const me = await band.getAgentMe(receiver);
        cache[receiverKey] = me.handle || me.id;
        if (receiverSlot === "a") cache.aName = me.name || me.id;
        else cache.bName = me.name || me.id;
      }
      const handle = cache[receiverKey]!;
      const displayName =
        (receiverSlot === "a" ? cache.aName : cache.bName) || handle;

      let rid = roomId;
      if (!rid) {
        rid = await band.createRoom(sender, `tama pets ${senderSlot}-${receiverSlot}`);
        try {
          await band.addParticipant(sender, rid, receiver.id);
        } catch (err) {
          // Non-fatal: /messages/next will just return 204 for the receiver
          // until the participant is added out-of-band.
          console.warn("[band] addParticipant failed:", err);
        }
      }

      // Content carries the mention (Band routing requirement) plus a small
      // envelope tag so we can recover the nudge id and kind on the other side.
      const content = `@${handle} [nudge:${nudgeId}:${kind}] ${text}`;
      const messageId = await band.sendTextMessage(sender, rid, content, {
        id: receiver.id,
        handle,
        name: displayName,
      });
      return { ok: true as const, roomId: rid, messageId };
    } catch (err) {
      console.warn("[band] send failed:", err);
      return { ok: false as const, reason: "send-error" };
    }
  });

export const bandPollNudge = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => PollInput.parse(v))
  .handler(async ({ data }) => {
    const band = await import("./band.server");
    const me = band.readBandAgent(data.slot);
    if (!me) return { ok: false as const, reason: "not-configured" };
    try {
      const msg = await band.getNextMessage(me, data.roomId);
      if (!msg) return { ok: true as const, nudge: null };
      // Skip our own messages (agent sends land in the room's log too).
      if (msg.sender_id === me.id) {
        await band.markProcessing(me, msg.id).catch(() => {});
        await band.markProcessed(me, msg.id).catch(() => {});
        return { ok: true as const, nudge: null };
      }
      // Extract nudge envelope. Content shape: "@handle [nudge:<id>:<kind>] <text>"
      const m = msg.content.match(/\[nudge:([^:\]]+):([^\]]+)\]\s*(.+)$/s);
      if (!m) {
        // Not a nudge — mark processed and skip.
        await band.markProcessing(me, msg.id).catch(() => {});
        await band.markProcessed(me, msg.id).catch(() => {});
        return { ok: true as const, nudge: null };
      }
      const [, nudgeId, rawKind, rawText] = m;
      const text = rawText.trim().slice(0, 240);
      const kindParse = KindSchema.safeParse(rawKind);
      const kind = kindParse.success ? kindParse.data : "nudge";
      // Post-receive policy re-check (defense in depth).
      if (!text || text.length > 240) {
        await band.markProcessing(me, msg.id).catch(() => {});
        await band.markProcessed(me, msg.id).catch(() => {});
        return { ok: true as const, nudge: null };
      }
      await band.markProcessing(me, msg.id).catch(() => {});
      await band.markProcessed(me, msg.id).catch(() => {});
      return { ok: true as const, nudge: { id: nudgeId, text, kind } };
    } catch (err) {
      console.warn("[band] poll failed:", err);
      return { ok: false as const, reason: "poll-error" };
    }
  });

export const bandStatus = createServerFn({ method: "GET" }).handler(async () => {
  return {
    aConfigured:
      !!process.env.BAND_AGENT_A_ID && !!process.env.BAND_AGENT_A_KEY,
    bConfigured:
      !!process.env.BAND_AGENT_B_ID && !!process.env.BAND_AGENT_B_KEY,
  };
});
