// Supabase Edge Function: pet-brain
// Real LLM call behind Pocket. The client always has a deterministic local
// fallback (wellbeingInferenceService.ts) — this function is an enhancement,
// never a hard dependency, so a flaky venue wifi never blocks the demo.
//
// Model backend is tried in order and never throws past this point:
//   1. Amazon Bedrock via its provider-agnostic Converse API (BEDROCK_API_KEY / AWS_REGION /
//      BEDROCK_MODEL_ID) — works with any Bedrock-hosted model (Claude, GPT, Grok, etc.),
//      not just Anthropic's, since Converse normalizes the request/response shape.
//   2. Direct Anthropic API (ANTHROPIC_API_KEY)
//   3. Not configured — client falls back to the local instant reply.
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

function buildPromptText(body: RequestBody): string {
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

  return [
    historyLines ? `recent conversation:\n${historyLines}` : null,
    userTurn || "user opened the app for a check-in with no specific message.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Either a successful structured-JSON text blob, or an explicit model refusal
// (a real answer, not an infra failure — surfaced to the client as-is, no fallback).
type ModelInvocation = { ok: true; text: string } | { ok: false; reason: "refusal" };

// Debug-only breadcrumb for the last Bedrock failure reason — surfaced in the
// "not configured" response so we can diagnose without a log-tailing command.
let lastBedrockDebug: string | null = null;

// Strips markdown code fences and any leading/trailing chatter a model adds
// despite instructions, leaving just the JSON object substring.
function extractJsonText(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);
  return text;
}

const RETURN_REPLY_TOOL = {
  toolSpec: {
    name: "return_pocket_reply",
    description: "Return Pocket's structured reply.",
    inputSchema: { json: RESPONSE_SCHEMA },
  },
};

function converseRequest(
  apiKey: string,
  region: string,
  modelId: string,
  promptText: string,
  useTool: boolean,
): Promise<Response> {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: [{ text: promptText }] }],
      system: [{ text: POCKET_SYSTEM_PROMPT }],
      inferenceConfig: { maxTokens: 1024 },
      ...(useTool
        ? { toolConfig: { tools: [RETURN_REPLY_TOOL], toolChoice: { tool: { name: "return_pocket_reply" } } } }
        : {}),
    }),
  });
}

// Returns null when this backend isn't configured, or failed for any infra
// reason (network, auth, malformed response) — callers treat null as "try
// the next backend," never as a thrown error. Works with any Bedrock-hosted
// model via the provider-agnostic Converse API — Claude, GPT, Grok, etc.
async function callBedrock(promptText: string): Promise<ModelInvocation | null> {
  const apiKey = Deno.env.get("BEDROCK_API_KEY");
  const region = Deno.env.get("AWS_REGION");
  const modelId = Deno.env.get("BEDROCK_MODEL_ID");

  if (!apiKey || !region || !modelId) return null;

  try {
    // Preferred path: force a structured tool call so we get parsed JSON directly.
    let res = await converseRequest(apiKey, region, modelId, promptText, true);
    let usedTool = true;

    if (!res.ok) {
      // Some models on Bedrock don't support toolConfig — retry as plain JSON-in-prompt.
      const firstErr = await res.text();
      res = await converseRequest(apiKey, region, modelId, promptText, false);
      usedTool = false;
      if (!res.ok) {
        lastBedrockDebug = `bedrock converse failed (with tool): ${firstErr}; (without tool): ${await res.text()}`;
        console.error(lastBedrockDebug);
        return null;
      }
    }

    const json = await res.json();
    if (json.stopReason === "content_filtered") return { ok: false, reason: "refusal" };

    const content = json.output?.message?.content ?? [];
    if (usedTool) {
      const toolUse = content.find((b: { toolUse?: { input?: unknown } }) => b.toolUse)?.toolUse;
      if (toolUse?.input) return { ok: true, text: JSON.stringify(toolUse.input) };
    }
    const textBlock = content.find((b: { text?: string }) => typeof b.text === "string");
    if (!textBlock?.text) {
      lastBedrockDebug = `bedrock converse response had no usable content: ${JSON.stringify(json)}`;
      console.error(lastBedrockDebug);
      return null;
    }
    return { ok: true, text: extractJsonText(textBlock.text) };
  } catch (error) {
    lastBedrockDebug = `bedrock call threw: ${String(error)}`;
    console.error(lastBedrockDebug);
    return null;
  }
}

async function callAnthropicDirect(promptText: string): Promise<ModelInvocation | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: POCKET_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [{ role: "user", content: promptText }],
    });

    if (response.stop_reason === "refusal") return { ok: false, reason: "refusal" };

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) {
      console.error("anthropic response had no text block");
      return null;
    }
    return { ok: true, text: textBlock.text };
  } catch (error) {
    console.error("anthropic call threw", error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const promptText = buildPromptText(body);

    const result = (await callBedrock(promptText)) ?? (await callAnthropicDirect(promptText));

    if (!result) {
      return new Response(
        JSON.stringify({
          error: "no model backend configured (set BEDROCK_API_KEY/AWS_REGION/BEDROCK_MODEL_ID, or ANTHROPIC_API_KEY)",
          debug: {
            hasBedrockApiKey: Boolean(Deno.env.get("BEDROCK_API_KEY")),
            hasAwsRegion: Boolean(Deno.env.get("AWS_REGION")),
            hasBedrockModelId: Boolean(Deno.env.get("BEDROCK_MODEL_ID")),
            hasAnthropicApiKey: Boolean(Deno.env.get("ANTHROPIC_API_KEY")),
            lastBedrockDebug,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.reason }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(extractJsonText(result.text));
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
