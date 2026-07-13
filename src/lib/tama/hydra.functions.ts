// Server functions bridging the client to HydraDB. Never import ./hydra.server
// at module scope — load it inside handlers only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MemoryItem = z.object({
  text: z.string().min(1).max(2000),
  category: z.string().optional(),
  confidence: z.string().optional(),
  inferenceId: z.string().optional(),
});

export const hydraStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { hydraConfigured } = await import("./hydra.server");
  return { configured: hydraConfigured() };
});

export const hydraSaveFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        collection: z.string().min(1).max(80),
        items: z.array(MemoryItem).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { hydraConfigured, ingestMemories } = await import("./hydra.server");
    if (!hydraConfigured()) return { ok: false, ids: [], reason: "unconfigured" };
    try {
      const { ids } = await ingestMemories({
        collection: data.collection,
        items: data.items.map((it) => ({
          text: it.text,
          additional_metadata: {
            category: it.category,
            confidence: it.confidence,
            inference_id: it.inferenceId,
          },
        })),
      });
      return { ok: true, ids, reason: null };
    } catch (err) {
      console.warn("[hydra] save failed:", err);
      return { ok: false, ids: [], reason: String(err) };
    }
  });

export const hydraRetrieveFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        collection: z.string().min(1).max(80),
        query: z.string().min(1).max(500),
        maxResults: z.number().int().min(1).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { hydraConfigured, queryMemories } = await import("./hydra.server");
    if (!hydraConfigured()) return { ok: false as const, chunks: [] as { id: string; text: string; score: number }[] };
    try {
      const chunks = await queryMemories(
        data.collection,
        data.query,
        data.maxResults ?? 6,
      );
      return {
        ok: true as const,
        chunks: chunks.map((c) => ({
          id: c.id,
          text: c.chunk_content ?? "",
          score: c.relevancy_score ?? 0,
        })),
      };
    } catch (err) {
      console.warn("[hydra] retrieve failed:", err);
      return { ok: false as const, chunks: [] as { id: string; text: string; score: number }[] };
    }
  });


export const hydraForgetFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        collection: z.string().min(1).max(80),
        ids: z.array(z.string()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { hydraConfigured, deleteMemoryIds, listMemoryIds } = await import(
      "./hydra.server"
    );
    if (!hydraConfigured()) return { ok: false, deleted: 0 };
    try {
      const ids = data.ids?.length ? data.ids : await listMemoryIds(data.collection);
      if (!ids.length) return { ok: true, deleted: 0 };
      // Chunk deletes to be gentle.
      for (let i = 0; i < ids.length; i += 50) {
        await deleteMemoryIds(data.collection, ids.slice(i, i + 50));
      }
      return { ok: true, deleted: ids.length };
    } catch (err) {
      console.warn("[hydra] forget failed:", err);
      return { ok: false, deleted: 0 };
    }
  });

export type RelationEdge = {
  source: string;
  target: string;
  predicate: string;
  confidence: number;
};

export const hydraRelationsFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ collection: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { hydraConfigured, fetchRelations } = await import("./hydra.server");
    if (!hydraConfigured()) return { ok: false as const, edges: [] as RelationEdge[] };
    try {
      const relations = await fetchRelations(data.collection, 60);
      const edges: RelationEdge[] = [];
      for (const r of relations) {
        for (const rel of r.relations ?? []) {
          edges.push({
            source: r.source?.name ?? "",
            target: r.target?.name ?? "",
            predicate: rel.canonical_predicate ?? rel.raw_predicate ?? "related",
            confidence: rel.confidence ?? 0,
          });
        }
      }
      return { ok: true as const, edges };
    } catch (err) {
      console.warn("[hydra] relations failed:", err);
      return { ok: false as const, edges: [] as RelationEdge[] };
    }
  });

