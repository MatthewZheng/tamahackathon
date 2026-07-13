supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref fheuqhsxlusdpfllbinu

This repo is not a blank slate — it's a fully working local-only MVP that already matches almost everything in the plan you and I sketched earlier. Someone (Lovable, presumably) built the whole client-side simulation. Here's the inventory.

src/lib/tama/ — the brain (currently 100% local, no backend)

File: types.ts
What it does: The contract: WellbeingState (rest/body/spark),
CompanionInference, InferenceResult, ConsentSettings, FriendNudge,
PetSignal, etc. This is the seam your partner and you should keep coding
against.
────────────────────────────────────────
File: constants.ts
What it does: POCKET_SYSTEM_PROMPT is already written — the full persona
(lowercase, "tiny step?", can't die, crisis handoff rule, no diagnosing).
 This is genuinely good and ready to hand to an LLM. Also the prompt bank
 and DEFAULT_WELLBEING.
────────────────────────────────────────
File: store.tsx
What it does: The whole app state machine — a useReducer + Context. Every
action (quickAnswer, sayMore, skipDays, sendPetSignal, etc.) lives here.
This is currently the single point where a Supabase swap plugs in.
────────────────────────────────────────
File: wellbeingInferenceService.ts
What it does: This is the "pet brain" — but it's fake. No LLM call. It's
deterministic keyword matching ("tired", "lonely", "overwhelmed" → meter
deltas + canned reply). This is the #1 thing to replace.
────────────────────────────────────────
File: crisisDetectionService.ts
What it does: Regex-based self-harm phrase detection. Deterministic on
purpose — keep this local/client-side even after you add an  LLM, for
latency and safety reasons (never gate crisis detection on a network
round trip).
────────────────────────────────────────
File: companionMemoryService.ts
What it does: Pure CRUD functions over the inference list
(add/edit/delete/confirm/reject/export). No backend.
────────────────────────────────────────
File: storageService.ts
What it does: localStorage only. Everything resets per-browser, nothing
syncs across devices.
────────────────────────────────────────
File: services.ts
What it does: This is the file already scaffolded for you. insforgeService,
memoryProvider, petSignalService are literally stubbed adapters marked
"future backend" — someone already designed the seam for
Supabase/InsForge. Right now they're all no-ops that pretend to succeed.

src/components/tama/ — the UI (Lovable territory, keep it dumb)

File: TamaApp.tsx
What it does: Page shell/layout, mounts everything.
────────────────────────────────────────
File: RetroDevice.tsx
What it does: The LCD + 3-button Tamagotchi device — your nostalgia frame,
already built.
────────────────────────────────────────
File: PocketSprite.tsx
What it does: Original pixel-blob SVG sprite, 5 states
(idle/perked/sleepy/low/celebrating), CSS-animated.
────────────────────────────────────────
File: FloatingOverlay.tsx
What it does: This is your "non-intrusive overlay" requirement, already
done — draggable-corner widget, collapse/hide/expand, exactly  the
ChatGPT-bubble pattern you asked for.
────────────────────────────────────────
File: Conversation.tsx
What it does: Chat log + quick answers + "say more" escape hatch +
recommendation CTAs (breathe/sit/water/friend).
────────────────────────────────────────
File: Meters.tsx
What it does: The 3 bars (rest/body/spark), reads state.wellbeing.
────────────────────────────────────────
File: Activities.tsx
What it does: Breathing (4-7-8), sit-still, water rituals — all with a fast
"demo" mode timing. Well built.
────────────────────────────────────────
File: MemoryPanel.tsx
What it does: "What Pocket noticed" — inference
review/edit/confirm/reject/delete/export JSON. Your consent story,
visualized.
────────────────────────────────────────
File: SettingsPanel.tsx
What it does: Consent toggles + every dev/demo button already exists here:
seed week, trigger low meters, skip 3 days, trigger crisis, send pet
signal, receive nudge, reset all. Opened via Shift+D.
────────────────────────────────────────
File: Yard.tsx
What it does: Social feature — but entirely simulated in one browser, no
second user, no network. Buttons literally say "simulate."
────────────────────────────────────────
File: CrisisHandoff.tsx
What it does: 988/911/text modal, copy-message-to-trusted-person. Already
solid.
────────────────────────────────────────
File: TamaErrorBoundary.tsx
What it does: Catch-all fallback UI.

Boilerplate (ignore)

router.tsx, server.ts, start.ts, routes/*, lib/error-*.ts, lib/lovable-error-reporting.ts — TanStack Start + Lovable scaffolding, not app logic. components/ui/* is the shadcn library, mostly unused by Tama.

No Supabase client is installed yet (package.json has no @supabase/supabase-js), no .env, no supabase/ folder. This is greenfield.

---
The real gap

Everything you asked me to build already has a simulated version. The job isn't "build the pet brain" from scratch — it's replace the fakes with real backend calls without breaking the persona or the demo safety net. Three fakes, in priority order:

1. wellbeingInferenceService.infer() is keyword-matching, not a real LLM → replace with a Supabase Edge Function calling Claude.
2. storageService is localStorage only → replace with Supabase tables so state can be shared/synced.
3. Yard.tsx "simulate nudge" buttons don't touch a network → replace with a real nudges table + Realtime subscription (the two-browser-tab demo we discussed).

Keep crisisDetectionService.ts exactly as-is, client-side, ungated by network calls. Don't move crisis detection into the LLM round trip.