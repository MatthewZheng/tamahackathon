# InsForge Integration Plan

Local-first stays the default. Everything below is additive: logged-out mode continues to work exactly as today. When a user signs in, we mirror the same state to InsForge and subscribe to friend signals live.

## What you'll need to do first

1. Run locally:
   ```
   npx @insforge/cli login
   npx @insforge/cli link
   npx @insforge/cli current
   ```
2. Paste the **project URL** and **anon/publishable key** into the chat. Since `VITE_*` secrets are reserved in Lovable, I'll embed them in `src/lib/tama/insforgeConfig.ts` as `INSFORGE_URL` / `INSFORGE_ANON_KEY` constants (publishable = safe client-side, just like Supabase's anon key).
3. Enable **Google OAuth** in the InsForge dashboard for that project.

## Decisions locked in

- Auth: email/password + Google OAuth via InsForge auth.
- Pairing: 6-char code (primary) + shareable `/pair/:code` link.
- Delete account: wipes server rows AND clears localStorage; user lands back at onboarding.

## Files I'll add

```text
src/lib/tama/
  insforgeConfig.ts        publishable URL + anon key (inlined)
  insforgeClient.ts        SDK singleton, safe when unconfigured
  insforgeAuth.ts          signIn/signUp/google/signOut + auth state stream
  insforgeSync.ts          debounced upsert of state → tables (per-slice)
  insforgeHydrate.ts       on-login: pull all rows → dispatch into store
  insforgeFriends.ts       invite code CRUD, pair(), unpair()
  insforgeRealtime.ts      subscribe to signals table for paired friend
  insforgePublish.ts       publishFriendNudge() — enforces text-only payload

src/components/tama/
  AuthPanel.tsx            email/pw form + Google button + link/paste code
  FriendPairPanel.tsx      show your code, enter friend's code, unpair
  (Onboarding.tsx)         + optional "sync across devices" step
  (SettingsPanel.tsx)      account row, sign out, delete account, pair UI
  (Yard.tsx)               real friend when paired, sim friend when logged out

src/routes/
  pair.$code.tsx           deep-link that auto-fills invite code
```

## Database (InsForge Postgres, RLS on)

```text
profiles           user_id (PK, FK auth), user_name, pet_name, sprite_tint
wellbeing_state    user_id (PK), rest, body, spark, sprite_state, updated_at
consent            user_id (PK), memory_enabled, pet_signals_enabled, ...
conversation      id, user_id, from, text, at   (append-only, capped 200)
memory             id, user_id, category, statement, source_text, confidence,
                   user_confirmed, is_active, created_at
positive_memories  id, user_id, text, at
friends            id, owner_id, friend_user_id, created_at
invite_codes       code (PK), owner_id, expires_at
pet_signals        id, sender_id, recipient_id, generic_text, at, seen
```

RLS: every table gates by `owner_id = auth.uid()` or `sender_id/recipient_id = auth.uid()`. `invite_codes` allows a public read-by-code (needed for redemption) but only the owner can insert/delete.

## Privacy enforcement (in code, not just UI)

- `insforgeSync.syncMemory()` short-circuits and calls `deleteAllMemoryRows(userId)` when `consent.memoryEnabled === false`. This runs any time consent flips off, not only at sync time.
- `insforgePublish.publishFriendNudge()` accepts only `{ genericText: string }` — the function signature literally cannot carry meter values or messages. It calls `petSignalService.translateForFriend()` internally and inserts only that text plus `sender_id`, `recipient_id`, `at`. Meter and mood data never enter this function.
- `deleteAccount()`: sequenced delete of all 9 tables for the user, then `supabase.auth.signOut()` (InsForge equivalent), then `storageService.clear()`, then `dispatch({ type: "resetAll" })`.

## Store wiring

- New state: `account: { userId, email, status: "signed-out" | "syncing" | "synced" | "error" }`, `friend: { userId, name, petName } | null`, `incomingNudge: string | null`.
- `TamaProvider` mounts `insforgeAuth.onChange()` once. On sign-in it calls `hydrateFromServer()`, then attaches sync subscribers to state slices with 800ms debounce per slice.
- Realtime subscription for `pet_signals` where `recipient_id = me` sets `incomingNudge` → Yard renders it.

## Demo panel additions

- "sign out" and "delete account" buttons visible when signed in.
- "simulate friend nudge" already exists; when signed in + paired, it goes through `publishFriendNudge` end-to-end instead of the local shortcut, so judges can see realtime.

## What stays untouched

- LLM path (Nebius → Lovable → local).
- Crisis logic and preview.
- The lowercase design system, sprite states, activities, memory-consent flow.
- Every existing localStorage key. Server is a mirror, not a replacement.

## Order of work

1. Config + client + auth (verify sign-up round-trips).
2. Migrations (all 9 tables + RLS in one migration).
3. Sync (hydrate on login → per-slice debounced upsert).
4. Consent-gated memory delete.
5. Friends + realtime nudges.
6. Delete-account + UI wiring in Onboarding/Settings/Yard.
7. Manual end-to-end verify with two browser profiles.

Ready to build once the URL + anon key land in chat. Approve to proceed.
