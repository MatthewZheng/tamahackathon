import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export function createNebiusProvider(nebiusApiKey: string) {
  return createOpenAICompatible({
    name: "nebius",
    baseURL: "https://api.studio.nebius.ai/v1",
    headers: {
      Authorization: `Bearer ${nebiusApiKey}`,
    },
  });
}
