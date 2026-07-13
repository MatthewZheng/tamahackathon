// Band REST helpers. Server-only — never import from client code.
// API keys live in process.env and never leave the server.
//
// Two agents are provisioned per project (slot "a" and slot "b"). Two paired
// pets are represented by these two agent identities so they can add each
// other as participants (Band requires "sibling agents" of the same owner).

const BAND_BASE = "https://app.band.ai/api/v1";

export type Slot = "a" | "b";

export type BandAgent = { id: string; apiKey: string };

export function readBandAgent(slot: Slot): BandAgent | null {
  const id =
    slot === "a" ? process.env.BAND_AGENT_A_ID : process.env.BAND_AGENT_B_ID;
  const apiKey =
    slot === "a" ? process.env.BAND_AGENT_A_KEY : process.env.BAND_AGENT_B_KEY;
  if (!id || !apiKey) return null;
  return { id, apiKey };
}

async function bandFetch(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${BAND_BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": apiKey,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// -------- rooms --------
export async function createRoom(
  sender: BandAgent,
  title: string,
): Promise<string> {
  const res = await bandFetch(sender.apiKey, "POST", "/agent/chats", {
    chat: { title: title.slice(0, 120) },
  });
  if (!res.ok) throw new Error(`band createRoom ${res.status}`);
  const j = (await res.json()) as { data: { id: string } };
  return j.data.id;
}

export async function addParticipant(
  owner: BandAgent,
  roomId: string,
  participantId: string,
): Promise<void> {
  const res = await bandFetch(
    owner.apiKey,
    "POST",
    `/agent/chats/${roomId}/participants`,
    { participant: { participant_id: participantId, role: "member" } },
  );
  // 201 created; 422 "already a participant" is fine.
  if (!res.ok && res.status !== 422 && res.status !== 409) {
    throw new Error(`band addParticipant ${res.status}`);
  }
}

// -------- messages --------
export async function sendTextMessage(
  sender: BandAgent,
  roomId: string,
  content: string,
  mention: { id: string; handle: string; name: string },
): Promise<string> {
  const res = await bandFetch(
    sender.apiKey,
    "POST",
    `/agent/chats/${roomId}/messages`,
    {
      message: {
        content,
        mentions: [mention],
      },
    },
  );
  if (!res.ok) throw new Error(`band sendMessage ${res.status}`);
  const j = (await res.json()) as { data: { id: string } };
  return j.data.id;
}

export type BandMessage = {
  id: string;
  content: string;
  sender_id: string;
  sender_type: string;
  message_type: string;
};

export async function getNextMessage(
  agent: BandAgent,
  roomId: string,
): Promise<BandMessage | null> {
  const res = await bandFetch(
    agent.apiKey,
    "GET",
    `/agent/chats/${roomId}/messages/next`,
  );
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`band next ${res.status}`);
  const j = (await res.json()) as { data: BandMessage };
  return j.data;
}

export async function markProcessing(
  agent: BandAgent,
  messageId: string,
): Promise<void> {
  await bandFetch(
    agent.apiKey,
    "POST",
    `/agent/messages/${messageId}/processing`,
  );
}

export async function markProcessed(
  agent: BandAgent,
  messageId: string,
): Promise<void> {
  await bandFetch(
    agent.apiKey,
    "POST",
    `/agent/messages/${messageId}/processed`,
  );
}

// -------- identity --------
export async function getAgentMe(
  agent: BandAgent,
): Promise<{ id: string; handle?: string; name?: string }> {
  const res = await bandFetch(agent.apiKey, "GET", "/agent/me");
  if (!res.ok) throw new Error(`band me ${res.status}`);
  const j = (await res.json()) as { data: { id: string; handle?: string; name?: string } };
  return j.data;
}
