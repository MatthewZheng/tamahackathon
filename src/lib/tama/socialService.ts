import { supabase, supabaseConfigured, getProfileId, friendProfileId } from "./supabaseClient";

export type RemoteNudge = {
  id: string;
  from_profile: string;
  to_profile: string;
  text: string;
  resolved: boolean;
  created_at: string;
};

export type RemotePetSignal = {
  id: string;
  profile_id: string;
  reason: string;
  text: string;
  active: boolean;
  created_at: string;
};

// Real network calls for the social loop — this is the piece that should
// visibly cross the wire between two browser tabs (?user=sam / ?user=jamie).
export const socialService = {
  configured: supabaseConfigured,

  async sendPetSignal(reason: string, text: string): Promise<RemotePetSignal | null> {
    if (!supabase) return null;
    const profileId = getProfileId();
    const { data } = await supabase
      .from("pet_signals")
      .insert({ profile_id: profileId, reason, text })
      .select()
      .single();
    return (data as RemotePetSignal) ?? null;
  },

  async sendNudge(text = "thinking of you 👋"): Promise<RemoteNudge | null> {
    if (!supabase) return null;
    const profileId = getProfileId();
    const { data } = await supabase
      .from("nudges")
      .insert({ from_profile: profileId, to_profile: friendProfileId(profileId), text })
      .select()
      .single();
    return (data as RemoteNudge) ?? null;
  },

  async resolveNudge(id: string): Promise<void> {
    if (!supabase) return;
    await supabase.from("nudges").update({ resolved: true }).eq("id", id);
  },

  // Live subscription: fires when the *other* tab sends a nudge to me.
  subscribeToIncomingNudges(onNudge: (n: RemoteNudge) => void): () => void {
    const client = supabase;
    if (!client) return () => {};
    const profileId = getProfileId();
    const channel = client
      .channel(`nudges:${profileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nudges", filter: `to_profile=eq.${profileId}` },
        (payload) => onNudge(payload.new as RemoteNudge),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  },
};
