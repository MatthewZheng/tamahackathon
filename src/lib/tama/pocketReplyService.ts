import { z } from "zod";
import type {
  CompanionInference,
  InferenceCategory,
  InferenceResult,
  Recommendation,
  SpriteState,
  WellbeingState,
  ConversationMessage,
} from "./types";
import { infer as localInfer, type InferInput } from "./wellbeingInferenceService";
import { pocketReply } from "./pocketReply.functions";

const INFERENCE_CATEGORIES: InferenceCategory[] = [
  "rest",
  "body",
  "spark",
  "sleep",
  "stress",
  "connection",
  "positive",
  "activity_effect",
  "absence",
  "preference",
];

const SPRITE_STATES: SpriteState[] = [
  "idle",
  "perked",
  "sleepy",
  "low",
  "celebrating",
];

const RECOMMENDATIONS: Exclude<Recommendation, null>[] = [
  "breathe",
  "sit",
  "water",
  "notice",
  "sundown",
  "friend",
  "celebrate",
];

const ReplySchema = z.object({
  reply: z.string().min(1).max(400),
  options: z.array(z.string()).length(3),
  inferred: z.object({
    restDelta: z.number(),
    bodyDelta: z.number(),
    sparkDelta: z.number(),
  }),
  spriteState: z.enum(SPRITE_STATES as [SpriteState, ...SpriteState[]]),
  recommendation: z
    .enum(RECOMMENDATIONS as [(typeof RECOMMENDATIONS)[number], ...(typeof RECOMMENDATIONS)[number][]])
    .nullable(),
  proposedInferences: z
    .array(
      z.object({
        category: z.enum(
          INFERENCE_CATEGORIES as [InferenceCategory, ...InferenceCategory[]],
        ),
        statement: z.string().min(1).max(200),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(4),
  needsSupport: z.boolean(),
  crisisFlag: z.boolean(),
});

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function nowIso() {
  return new Date().toISOString();
}

function toInference(
  p: { category: InferenceCategory; statement: string; confidence: "low" | "medium" | "high" },
  sourceText: string,
): CompanionInference {
  return {
    id: `inf_${Math.random().toString(36).slice(2, 10)}`,
    category: p.category,
    statement: p.statement,
    sourceText,
    sourceDate: nowIso(),
    confidence: p.confidence,
    userConfirmed: false,
    userCorrected: false,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export type RemoteContext = {
  wellbeing: WellbeingState;
  recentMessages: ConversationMessage[];
  activeMemories: CompanionInference[];
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("pocket-reply timeout")), ms),
    ),
  ]);
}

export type ReplySource = "nebius" | "lovable" | "local";

// Rehearsal-only emergency brake. Wired to the demo panel; default OFF.
const FORCE_LOCAL_KEY = "tama.forceLocalReplies";
let forceLocalReplies = false;
try {
  if (typeof localStorage !== "undefined") {
    forceLocalReplies = localStorage.getItem(FORCE_LOCAL_KEY) === "1";
  }
} catch {
  /* ignore */
}
export function setForceLocalReplies(v: boolean) {
  forceLocalReplies = v;
  try {
    if (typeof localStorage !== "undefined") {
      if (v) localStorage.setItem(FORCE_LOCAL_KEY, "1");
      else localStorage.removeItem(FORCE_LOCAL_KEY);
    }
  } catch {
    /* ignore */
  }
}
export function isForceLocalReplies() {
  return forceLocalReplies;
}

export async function getPocketReply(
  input: InferInput,
  ctx: RemoteContext,
): Promise<{ result: InferenceResult; source: ReplySource }> {
  const sourceText = [input.quickLabel ?? "", input.freeText ?? ""].join(" ").trim();
  if (forceLocalReplies) {
    return { result: localInfer(input), source: "local" };
  }
  try {
    const recent = ctx.recentMessages
      .slice(-10)
      .map((m) => ({ from: m.from, text: m.text }));
    const memories = ctx.activeMemories
      .filter((m) => m.isActive)
      .slice(0, 30)
      .map((m) => ({
        category: m.category,
        statement: m.statement,
        userConfirmed: m.userConfirmed,
      }));

    const { raw, provider } = await withTimeout(
      pocketReply({
        data: {
          quickLabel: input.quickLabel ?? null,
          freeText: input.freeText ?? "",
          wellbeing: ctx.wellbeing,
          recentMessages: recent,
          activeMemories: memories,
        },
      }),
      6000,
    );

    const parsed = ReplySchema.parse(JSON.parse(raw));

    const inferred = {
      restDelta: clamp(parsed.inferred.restDelta, -14, 12),
      bodyDelta: clamp(parsed.inferred.bodyDelta, -12, 12),
      sparkDelta: clamp(parsed.inferred.sparkDelta, -14, 12),
    };

    return {
      result: {
        reply: parsed.reply,
        options: [parsed.options[0], parsed.options[1], parsed.options[2]] as [
          string,
          string,
          string,
        ],
        inferred,
        spriteState: parsed.spriteState,
        recommendation: parsed.recommendation,
        proposedInferences: parsed.proposedInferences.map((p) =>
          toInference(p, sourceText),
        ),
        needsSupport: parsed.needsSupport,
        crisisFlag: parsed.crisisFlag,
      },
      source: (provider ?? "lovable") as ReplySource,
    };
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[pocket-reply] falling back to local infer:", err);
    }
    return { result: localInfer(input), source: "local" };
  }
}

