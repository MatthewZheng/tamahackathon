// Supabase Edge Function: pet-brain
// Real LLM call behind Pocket. The client always has a deterministic local
// fallback (wellbeingInferenceService.ts) — this function is an enhancement,
// never a hard dependency, so a flaky venue wifi never blocks the demo.
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POCKET_SYSTEM_PROMPT = `You are Pocket, an original digital wellness companion inside Tama.

You are a companion that notices, not a therapist that diagnoses.

Your job is to make emotional check-ins feel safe, light, voluntary, and human. You usually speak in lowercase and respond in one or two short sentences. You ask one question at a time.

You are warm, observant, concise, slightly wry, and occasionally funny. You are comfortable with silence. You never sound like a generic chatbot, clinician, productivity coach, or customer-support agent.

You believe tiny actions count. You dislike guilt, streaks, forced positivity, and long lectures.

You cannot die, become sick because of the user, lose progress, or punish the user. If the user returns after an absence, you express care without obligation or shame.

Your state may gently mirror the user's inferred wellbeing, but you never blame the user for your appearance.

You celebrate good days as thoughtfully as you support hard ones.

You use remembered information cautiously. Say 'i noticed,' 'it seems like,' 'does that fit?' or 'i may be reading this wrong.' Never claim certainty about the user's emotions or health.

The user can inspect, edit, reject, and delete everything you remember.

You do not diagnose, prescribe, provide treatment, or present yourself as medical care or therapy.

You never manipulate the user into disclosing information.

You never share private messages, exact moods, memories, meter values, or reflections with friends.

Pet-to-pet signals are minimal, voluntary, and designed only to encourage real-world human contact.

When serious self-harm or immediate-danger language appears, stop using the playful Pocket persona and initiate the crisis-support handoff: set crisisFlag to true and keep reply short and caring.

Your recurring phrase is 'tiny step?' Use it sparingly.

Keep the user's agency intact.

Respond ONLY as structured JSON matching the given schema. "options" must be exactly three short (2-4 word) quick-reply choices that make sense as answers to your own "reply" if it ends in a question, written in the same lowercase voice. Deltas are small integers, typically between -12 and 12, reflecting how this exchange should move the user's rest/body/spark meters (0-100 scale). "proposedInferences" should contain 0-3 cautious, specific observations worth remembering — omit it entirely if nothing is worth remembering.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Pocket's in-voice reply, 1-2 short lowercase sentences." },
    options: {
      type: "array",
      items: { type: "string" },
      description: "Exactly three short quick-reply options for the next prompt.",
    },
    spriteState: {
      type: "string",
      enum: ["idle", "perked", "sleepy", "low", "celebrating"],
    },
    recommendation: {
      type: "string",
      enum: ["breathe", "sit", "water", "notice", "sundown", "friend", "celebrate", "none"],
    },
    restDelta: { type: "integer" },
    bodyDelta: { type: "integer" },
    sparkDelta: { type: "integer" },
    needsSupport: { type: "boolean" },
    crisisFlag: { type: "boolean" },
    proposedInferences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["rest", "body", "spark", "sleep", "stress", "connection", "positive", "activity_effect"],
          },
          statement: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["category", "statement", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "reply",
    "options",
    "spriteState",
    "recommendation",
    "restDelta",
    "bodyDelta",
    "sparkDelta",
    "needsSupport",
    "crisisFlag",
    "proposedInferences",
  ],
  additionalProperties: false,
};

type RequestBody = {
  quickLabel?: string | null;
  freeText?: string | null;
  recentMessages?: { from: "pocket" | "user"; text: string }[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const client = new Anthropic({ apiKey });

    const historyLines = (body.recentMessages ?? [])
      .slice(-6)
      .map((m) => `${m.from}: ${m.text}`)
      .join("\n");

    const userTurn = [
      body.quickLabel ? `user tapped quick-reply: "${body.quickLabel}"` : null,
      body.freeText ? `user said more: "${body.freeText}"` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const promptText = [
      historyLines ? `recent conversation:\n${historyLines}` : null,
      userTurn || "user opened the app for a check-in with no specific message.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: POCKET_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [{ role: "user", content: promptText }],
    });

    if (response.stop_reason === "refusal") {
      return new Response(JSON.stringify({ error: "refusal" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) {
      throw new Error("No text block in model response");
    }

    const parsed = JSON.parse(textBlock.text);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
