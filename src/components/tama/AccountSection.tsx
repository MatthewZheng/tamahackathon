import { useState } from "react";
import { useTama } from "@/lib/tama/store";
import { isInsforgeConfigured } from "@/lib/tama/insforgeConfig";
import { signInEmail, signUpEmail, signInGoogle, signOut } from "@/lib/tama/insforgeAuth";
import { deleteAllServerData } from "@/lib/tama/insforgeSync";
import { createInviteCode, redeemInviteCode } from "@/lib/tama/insforgeFriends";
import { storageService } from "@/lib/tama/storageService";

export function AccountSection() {
  const { state, dispatch } = useTama();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [redeem, setRedeem] = useState("");

  const configured = isInsforgeConfigured();
  const signedIn = !!state.account.userId;

  const wrap = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/60">
        account & sync
      </h3>

      {!configured && (
        <div className="rounded-lg bg-cream/70 p-3 text-xs text-charcoal/70">
          sync is off. local-first only. add insforge url + anon key in
          <code className="mx-1 rounded bg-charcoal/10 px-1">src/lib/tama/insforgeConfig.ts</code>
          to enable accounts, cross-device sync, and live friend nudges.
        </div>
      )}

      {configured && !signedIn && (
        <div className="space-y-2 rounded-lg bg-cream/70 p-3 text-xs text-charcoal/80">
          <p className="italic text-charcoal/60">
            optional. tama works fully local. sign in to sync + connect with a friend.
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="w-full rounded-md border border-charcoal/15 bg-white/70 px-2 py-1.5 outline-none focus:border-orchid"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="password"
            className="w-full rounded-md border border-charcoal/15 bg-white/70 px-2 py-1.5 outline-none focus:border-orchid"
          />
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() =>
                wrap(async () => {
                  const res = (await signInEmail(email, password)) as { data?: { user?: { id: string; email: string } }; error?: { message?: string } };
                  if (res.error) throw new Error(res.error.message ?? "sign-in failed");
                  const u = res.data?.user;
                  if (u) dispatch({ type: "setAccount", userId: u.id, email: u.email });
                })
              }
              className="rounded-full bg-orchid px-3 py-1 text-cream disabled:opacity-50"
            >
              sign in
            </button>
            <button
              disabled={busy}
              onClick={() =>
                wrap(async () => {
                  const res = (await signUpEmail(email, password, state.userName)) as { data?: { user?: { id: string; email: string } }; error?: { message?: string } };
                  if (res.error) throw new Error(res.error.message ?? "sign-up failed");
                  const u = res.data?.user;
                  if (u) dispatch({ type: "setAccount", userId: u.id, email: u.email });
                  setMsg("check your inbox to verify email.");
                })
              }
              className="rounded-full border border-charcoal/20 bg-white/70 px-3 py-1 disabled:opacity-50"
            >
              create account
            </button>
            <button
              disabled={busy}
              onClick={() => wrap(async () => { await signInGoogle(); })}
              className="rounded-full border border-charcoal/20 bg-white/70 px-3 py-1 disabled:opacity-50"
            >
              google
            </button>
          </div>
        </div>
      )}

      {configured && signedIn && (
        <div className="space-y-2 rounded-lg bg-cream/70 p-3 text-xs text-charcoal/80">
          <p>
            signed in as <span className="font-mono">{state.account.email}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() =>
                wrap(async () => {
                  const code = await createInviteCode();
                  setInvite(code);
                })
              }
              className="rounded-full border border-charcoal/20 bg-white/70 px-3 py-1"
            >
              generate friend invite
            </button>
            <button
              disabled={busy}
              onClick={() =>
                wrap(async () => {
                  await signOut();
                  dispatch({ type: "setAccount", userId: null, email: null });
                  dispatch({ type: "setPairedFriend", friend: null });
                })
              }
              className="rounded-full border border-charcoal/20 bg-white/70 px-3 py-1"
            >
              sign out
            </button>
          </div>
          {invite && (
            <p className="rounded bg-white/70 p-2 font-mono">
              share this code: <span className="text-orchid">{invite}</span>
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              value={redeem}
              onChange={(e) => setRedeem(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="paste code"
              className="w-24 rounded-md border border-charcoal/15 bg-white/70 px-2 py-1 font-mono"
            />
            <button
              disabled={busy || redeem.length < 4}
              onClick={() =>
                wrap(async () => {
                  const r = await redeemInviteCode(redeem);
                  if (!r.ok) throw new Error(r.error ?? "redeem failed");
                  setMsg("paired! reload to see your friend.");
                })
              }
              className="rounded-full bg-lime px-3 py-1 font-medium text-charcoal disabled:opacity-50"
            >
              redeem
            </button>
          </div>

          {state.pairedFriend && (
            <p className="italic text-charcoal/60">
              paired with {state.pairedFriend.userName.toLowerCase()} & {state.pairedFriend.petName.toLowerCase()}.
            </p>
          )}

          <button
            disabled={busy}
            onClick={() =>
              wrap(async () => {
                if (!confirm("delete your account data on the server AND clear local storage?")) return;
                await deleteAllServerData();
                await signOut();
                storageService.clear();
                dispatch({ type: "resetAll" });
              })
            }
            className="rounded-full border border-red-400/40 bg-red-50 px-3 py-1 text-red-700"
          >
            delete my account and all data
          </button>
        </div>
      )}

      {msg && <p className="mt-2 text-xs italic text-charcoal/60">{msg}</p>}
    </section>
  );
}
