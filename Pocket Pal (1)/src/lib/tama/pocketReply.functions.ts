import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { POCKET_SYSTEM_PROMPT } from "./constants";

const InputSchema = z.object({
  quickLabel: z.string().nullable().optional(),
  freeText: z.string().optional(),
  wellbeing: z.object({
    rest: z.number(),
    body: z.number(),
    spark: z.number(),
  }),
  recentMessages: z
    .array(
      z.object({
        from: z.enum(["pocket", "user"]),
        text: z.string(),
      }),
    )
    .max(10),
  activeMemories: z
    .array(
      z.object({
        category: z.string(),
        statement: z.string(),
        userConfirmed: z.boolean(),
      }),
    )
    .max(30),
});

export type PocketReplyInput = z.infer<typeof InputSchema>;

const RESPONSE_INSTRUCTION = `Respond ONLY with a single strict JSON object (no prose, no code fences, no commentary) matching exactly this shape:

{
  "reply": string,                       // 1-2 short sentences, lowercase, pocket's voice
  "options": [string, string, string],   // three short quick-reply choices, lowercase
  "inferred": {
    "restDelta": number,                 // integer between -14 and 12
    "bodyDelta": number,                 // integer between -12 and 12
    "sparkDelta": number                 // integer between -14 and 12
  },
  "spriteState": "idle" | "perked" | "sleepy" | "low" | "celebrating",
  "recommendation": "breathe" | "sit" | "water" | "notice" | "sundown" | "friend" | "celebrate" | null,
  "proposedInferences": [
    {
      "category": "rest" | "body" | "spark" | "sleep" | "stress" | "connection" | "positive" | "activity_effect" | "absence" | "preference",
      "statement": string,
      "confidence": "low" | "medium" | "high"
    }
  ],
  "needsSupport": boolean,
  "crisisFlag": boolean
}

Guidance:
- Keep reply <= 140 characters, lowercase, in pocket's voice. Never diagnose.
- Reference remembered facts with hedged language ("i noticed…", "does that fit?") only when relevant. Prefer confirmed memories.
- Deltas reflect what the message suggests about the user's wellbeing right now. Small unless clear signal.
- proposedInferences must be new noticings from THIS message only — omit or return [] if nothing is clearly noticed.
- Set crisisFlag true only for self-harm / immediate-danger language.`;

export const pocketReply = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const memoryLines = data.activeMemories
      .map(
        (m) =>
          `- [${m.category}${m.userConfirmed ? " · confirmed" : ""}] ${m.statement}`,
      )
      .join("\n") || "(none yet)";

    const convoLines = data.recentMessages
      .map((m) => `${m.from}: ${m.text}`)
      .join("\n") || "(new conversation)";

    const userSignal = [
      data.quickLabel ? `quick reply: "${data.quickLabel}"` : null,
      data.freeText ? `free text: "${data.freeText}"` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = `Current wellbeing meters (0-100):
rest=${data.wellbeing.rest} body=${data.wellbeing.body} spark=${data.wellbeing.spark}

Recent conversation (oldest → newest):
${convoLines}

Active memories about the user:
${memoryLines}

Newest signal from the user:
${userSignal || "(no direct message)"}

${RESPONSE_INSTRUCTION}`;

    const { text } = await generateText({
      model,
      system: POCKET_SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    // Extract JSON (model may wrap in fences despite instruction)
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }

    return { raw: jsonText };
  });
