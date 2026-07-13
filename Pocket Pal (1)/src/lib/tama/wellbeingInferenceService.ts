import type {
  CompanionInference,
  InferenceCategory,
  InferenceResult,
  Recommendation,
  SpriteState,
} from "./types";
import { detectCrisis } from "./crisisDetectionService";

// Signal groups (deterministic phrase matching, lightweight scoring)
const REST_LOW = [
  "tired",
  "exhausted",
  "drained",
  "barely slept",
  "no sleep",
  "could not sleep",
  "couldn't sleep",
  "didn't sleep",
  "no energy",
  "burned out",
  "burnt out",
  "too much",
  "wiped",
];
const REST_UP = [
  "rested",
  "slept well",
  "refreshed",
  "took a break",
  "slowed down",
  "had a nap",
  "napped",
  "good sleep",
];
const BODY_LOW = [
  "thirsty",
  "forgot to eat",
  "haven't eaten",
  "tense",
  "headache",
  "shoulders hurt",
  "haven't moved",
  "have not moved",
  "stuck inside",
  "jaw clenched",
  "sore",
];
const BODY_UP = [
  "drank water",
  "ate",
  "walked",
  "stretched",
  "went outside",
  "exercised",
  "worked out",
  "relaxed my shoulders",
  "moved",
];
const SPARK_LOW = [
  "lonely",
  "isolated",
  "disconnected",
  "nothing sounds fun",
  "alone",
  "nobody",
  "don't want to talk",
  "do not want to talk",
  "empty",
  "numb",
];
const SPARK_UP = [
  "saw a friend",
  "laughed",
  "proud",
  "excited",
  "had fun",
  "accomplished",
  "connected",
  "good conversation",
  "peaceful",
  "grateful",
];
const HIGH_SUPPORT = [
  "overwhelmed",
  "spiraling",
  "can't handle this",
  "cannot handle this",
  "everything is too much",
  "breaking down",
  "not okay",
  "falling apart",
];

function has(text: string, phrases: string[]): string[] {
  const t = text.toLowerCase();
  return phrases.filter((p) => t.includes(p));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nowIso() {
  return new Date().toISOString();
}

function mkInference(
  category: InferenceCategory,
  statement: string,
  sourceText: string,
  confidence: "low" | "medium" | "high",
): CompanionInference {
  return {
    id: `inf_${Math.random().toString(36).slice(2, 10)}`,
    category,
    statement,
    sourceText,
    sourceDate: nowIso(),
    confidence,
    userConfirmed: false,
    userCorrected: false,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export type InferInput = {
  quick?: "A" | "B" | "C" | null;
  quickLabel?: string | null;
  freeText?: string;
};

export function infer(input: InferInput): InferenceResult {
  const text = [input.quickLabel ?? "", input.freeText ?? ""].join(" ").toLowerCase();
  const raw = [input.quickLabel ?? "", input.freeText ?? ""].join(" ").trim();

  const crisisFlag = detectCrisis(raw);

  let restDelta = 0;
  let bodyDelta = 0;
  let sparkDelta = 0;
  const proposed: CompanionInference[] = [];

  // Quick response biases
  if (input.quickLabel) {
    const q = input.quickLabel.toLowerCase();
    if (/(good|clear|pretty good|yeah|yes|quiet in here|mostly)/.test(q)) {
      sparkDelta += 6;
      restDelta += 2;
    }
    if (/(heavy|hard|cloudy|not really|a lot|hiding|static)/.test(q)) {
      sparkDelta -= 6;
      restDelta -= 3;
    }
    if (/(between|unsure|small thing|a little|space)/.test(q)) {
      sparkDelta -= 1;
    }
  }

  const restLowHits = has(text, REST_LOW);
  const restUpHits = has(text, REST_UP);
  const bodyLowHits = has(text, BODY_LOW);
  const bodyUpHits = has(text, BODY_UP);
  const sparkLowHits = has(text, SPARK_LOW);
  const sparkUpHits = has(text, SPARK_UP);
  const supportHits = has(text, HIGH_SUPPORT);

  restDelta += Math.min(restUpHits.length * 6, 12) - Math.min(restLowHits.length * 6, 14);
  bodyDelta += Math.min(bodyUpHits.length * 6, 12) - Math.min(bodyLowHits.length * 6, 12);
  sparkDelta += Math.min(sparkUpHits.length * 6, 12) - Math.min(sparkLowHits.length * 6, 12);

  // Cap so one message can't swing wildly
  restDelta = clamp(restDelta, -14, 12);
  bodyDelta = clamp(bodyDelta, -12, 12);
  sparkDelta = clamp(sparkDelta, -14, 12);

  // Proposed inferences
  if (restLowHits.length) {
    proposed.push(
      mkInference(
        "sleep",
        restLowHits.some((h) => h.includes("slept") || h.includes("sleep"))
          ? "you mentioned sleeping poorly."
          : "you sounded tired today.",
        raw,
        "medium",
      ),
    );
  }
  if (restUpHits.length) {
    proposed.push(mkInference("rest", "you sounded more rested today.", raw, "medium"));
  }
  if (bodyLowHits.length) {
    proposed.push(mkInference("body", "your body felt tense or unattended today.", raw, "low"));
  }
  if (bodyUpHits.length) {
    proposed.push(mkInference("body", "you took care of your body today.", raw, "medium"));
  }
  if (sparkLowHits.length) {
    proposed.push(mkInference("connection", "you sounded a bit disconnected today.", raw, "low"));
  }
  if (sparkUpHits.length) {
    proposed.push(mkInference("positive", "something felt good today.", raw, "medium"));
  }
  if (/work/.test(text) && (supportHits.length || sparkLowHits.length || /too much|overwhelm/.test(text))) {
    proposed.push(mkInference("stress", "work has felt overwhelming today.", raw, "medium"));
  }

  // Sprite state
  const total = 100 + sparkDelta + restDelta * 0.5;
  let spriteState: SpriteState = "idle";
  if (crisisFlag) spriteState = "low";
  else if (supportHits.length) spriteState = "low";
  else if (restDelta <= -6) spriteState = "sleepy";
  else if (sparkDelta >= 8) spriteState = "celebrating";
  else if (total < 90) spriteState = "sleepy";
  else if (total > 108) spriteState = "perked";

  // Recommendation
  let recommendation: Recommendation = null;
  if (crisisFlag) recommendation = null;
  else if (supportHits.length || sparkDelta <= -8) recommendation = "breathe";
  else if (bodyLowHits.some((h) => h.includes("thirsty") || h.includes("water") || h.includes("headache")))
    recommendation = "water";
  else if (restLowHits.length) recommendation = "sit";
  else if (sparkUpHits.length || sparkDelta >= 6) recommendation = "celebrate";
  else if (sparkLowHits.length) recommendation = "friend";

  // Reply (deterministic; persona-consistent)
  const reply = pickReply({
    crisisFlag,
    supportHits: supportHits.length > 0,
    sparkDelta,
    restDelta,
    bodyDelta,
    quickLabel: input.quickLabel ?? null,
    hasText: !!input.freeText,
  });

  return {
    reply,
    options: ["that helped", "not really", "try something else"],
    inferred: { restDelta, bodyDelta, sparkDelta },
    spriteState,
    recommendation,
    proposedInferences: proposed,
    needsSupport: supportHits.length > 0,
    crisisFlag,
  };
}

function pickReply(ctx: {
  crisisFlag: boolean;
  supportHits: boolean;
  sparkDelta: number;
  restDelta: number;
  bodyDelta: number;
  quickLabel: string | null;
  hasText: boolean;
}): string {
  if (ctx.crisisFlag) return "i'm really glad you told me.";
  if (ctx.supportHits) return "okay. no fixing everything. tiny step?";
  if (ctx.restDelta <= -6) return "sleep debt is real. want to sit for a minute?";
  if (ctx.sparkDelta >= 8) return "good. let's not rush past that.";
  if (ctx.sparkDelta <= -6) return "that sounds heavy. i'm here.";
  if (ctx.bodyDelta <= -6) return "hydration before philosophy?";
  if (ctx.quickLabel && /good|clear|yeah|yes/i.test(ctx.quickLabel))
    return "you sound lighter today. noted.";
  if (ctx.hasText) return "thanks for telling me. i'll hold that lightly.";
  return "okay. we can stay right here for a minute.";
}
