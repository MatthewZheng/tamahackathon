// Invite-code pairing. Anyone can generate a code; sharing it with a friend
// lets them redeem it, creating a symmetric friendship row on both sides.
import { insforge } from "./insforgeClient";

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createInviteCode(): Promise<string | null> {
  const c = insforge();
  if (!c) return null;
  const { data: userData } = await c.auth.getCurrentUser();
  const uid = (userData as { user?: { id: string } } | null)?.user?.id;
  if (!uid) return null;
  const code = makeCode();
  const { error } = await c.database
    .from("tama_invite_codes")
    .insert({ code, owner_id: uid, created_at: new Date().toISOString() })
    .select();
  if (error) return null;
  return code;
}

export async function redeemInviteCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const c = insforge();
  if (!c) return { ok: false, error: "not configured" };
  const { data: userData } = await c.auth.getCurrentUser();
  const uid = (userData as { user?: { id: string } } | null)?.user?.id;
  if (!uid) return { ok: false, error: "sign in first" };

  const { data } = await c.database
    .from("tama_invite_codes")
    .select("owner_id")
    .eq("code", code.toUpperCase())
    .limit(1);
  const row = (data as Array<{ owner_id: string }> | null)?.[0];
  if (!row) return { ok: false, error: "invalid code" };
  if (row.owner_id === uid) return { ok: false, error: "that's your own code" };

  // Symmetric friendship.
  await c.database
    .from("tama_friends")
    .insert([
      { user_id: uid, friend_id: row.owner_id, created_at: new Date().toISOString() },
      { user_id: row.owner_id, friend_id: uid, created_at: new Date().toISOString() },
    ])
    .select();
  return { ok: true };
}

export async function getPairedFriend(): Promise<{ id: string; userName: string; petName: string; spriteTint: string } | null> {
  const c = insforge();
  if (!c) return null;
  const { data: userData } = await c.auth.getCurrentUser();
  const uid = (userData as { user?: { id: string } } | null)?.user?.id;
  if (!uid) return null;
  const { data } = await c.database
    .from("tama_friends")
    .select("friend_id")
    .eq("user_id", uid)
    .limit(1);
  const fid = (data as Array<{ friend_id: string }> | null)?.[0]?.friend_id;
  if (!fid) return null;
  const { data: profRows } = await c.database
    .from("tama_profiles")
    .select()
    .eq("user_id", fid)
    .limit(1);
  const p = (profRows as Array<{ user_name: string; pet_name: string; sprite_tint: string }> | null)?.[0];
  if (!p) return { id: fid, userName: "friend", petName: "pet", spriteTint: "default" };
  return { id: fid, userName: p.user_name, petName: p.pet_name, spriteTint: p.sprite_tint };
}
