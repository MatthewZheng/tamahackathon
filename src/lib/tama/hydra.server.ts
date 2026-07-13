// HydraDB REST helpers. Server-only — never import from route/component files.
// Uses HYDRA_DB_API_KEY (required) and optional HYDRA_DB_DATABASE (defaults to "tama_mvp").

const BASE = "https://api.hydradb.com";

function auth() {
  const token = process.env.HYDRA_DB_API_KEY;
  if (!token) throw new Error("HYDRA_DB_API_KEY not configured");
  return {
    Authorization: `Bearer ${token}`,
    "API-Version": "2",
  };
}

export function hydraDatabase() {
  return process.env.HYDRA_DB_DATABASE || "tama_mvp";
}

export function hydraConfigured() {
  return Boolean(process.env.HYDRA_DB_API_KEY);
}

// One-time db bootstrap. Idempotent — ignores "already exists".
let ensured = false;
export async function ensureDatabase(): Promise<void> {
  if (ensured) return;
  ensured = true;
  const database = hydraDatabase();
  try {
    await fetch(`${BASE}/databases`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ database }),
    });
    // Poll a couple of times for readiness; ignore failures.
    for (let i = 0; i < 6; i++) {
      const r = await fetch(
        `${BASE}/databases/status?database=${encodeURIComponent(database)}`,
        { headers: auth() },
      );
      const j = (await r.json().catch(() => null)) as
        | { data?: { infra?: { ready_for_ingestion?: boolean } } }
        | null;
      if (j?.data?.infra?.ready_for_ingestion) break;
      await new Promise((res) => setTimeout(res, 1500));
    }
  } catch {
    /* best-effort */
  }
}

// -------- ingest memory --------
export type IngestMemoryInput = {
  collection: string;
  items: { text: string; additional_metadata?: Record<string, unknown> }[];
};

export async function ingestMemories(
  input: IngestMemoryInput,
): Promise<{ ids: string[] }> {
  if (!input.items.length) return { ids: [] };
  await ensureDatabase();
  const database = hydraDatabase();
  const form = new FormData();
  form.set("type", "memory");
  form.set("database", database);
  form.set("collection", input.collection);
  form.set(
    "memories",
    JSON.stringify(input.items.map((it) => ({ infer: false, ...it }))),
  );

  const r = await fetch(`${BASE}/context/ingest`, {
    method: "POST",
    headers: auth(),
    body: form,
  });
  const j = (await r.json().catch(() => null)) as
    | { data?: { results?: { id: string }[] } }
    | null;
  if (!r.ok) throw new Error(`hydra ingest failed [${r.status}]`);
  return { ids: (j?.data?.results ?? []).map((x) => x.id).filter(Boolean) };
}

// -------- query memory --------
export type QueryChunk = {
  id: string;
  chunk_content: string;
  relevancy_score?: number;
  additional_metadata?: Record<string, unknown>;
};

export async function queryMemories(
  collection: string,
  query: string,
  maxResults = 6,
): Promise<QueryChunk[]> {
  if (!query.trim()) return [];
  await ensureDatabase();
  const r = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      database: hydraDatabase(),
      collection,
      type: "memory",
      query,
      max_results: maxResults,
      graph_context: false,
    }),
  });
  if (!r.ok) throw new Error(`hydra query failed [${r.status}]`);
  const j = (await r.json()) as { data?: { chunks?: QueryChunk[] } };
  return j.data?.chunks ?? [];
}

// -------- delete memory --------
export async function deleteMemoryIds(
  collection: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  await fetch(`${BASE}/context`, {
    method: "DELETE",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "memory",
      request: { database: hydraDatabase(), collection, ids },
    }),
  });
}

// -------- list memory ids in a collection --------
export async function listMemoryIds(collection: string): Promise<string[]> {
  const url = new URL(`${BASE}/context/list`);
  url.searchParams.set("database", hydraDatabase());
  url.searchParams.set("collection", collection);
  url.searchParams.set("type", "memory");
  url.searchParams.set("limit", "500");
  const r = await fetch(url.toString(), { headers: auth() });
  if (!r.ok) return [];
  const j = (await r.json().catch(() => null)) as
    | { data?: { sources?: { id: string }[] } }
    | null;
  return (j?.data?.sources ?? []).map((s) => s.id).filter(Boolean);
}

// -------- relations (graph) --------
export type HydraRelation = {
  source: { name: string; type?: string; entity_id?: string };
  target: { name: string; type?: string; entity_id?: string };
  relations: {
    canonical_predicate?: string;
    raw_predicate?: string;
    context?: string;
    confidence?: number;
  }[];
};

export async function fetchRelations(
  collection: string,
  limit = 60,
): Promise<HydraRelation[]> {
  const url = new URL(`${BASE}/context/relations`);
  url.searchParams.set("database", hydraDatabase());
  url.searchParams.set("collection", collection);
  url.searchParams.set("type", "memory");
  url.searchParams.set("limit", String(limit));
  const r = await fetch(url.toString(), { headers: auth() });
  if (!r.ok) return [];
  const j = (await r.json().catch(() => null)) as
    | { data?: { relations?: HydraRelation[] } }
    | null;
  return j?.data?.relations ?? [];
}
