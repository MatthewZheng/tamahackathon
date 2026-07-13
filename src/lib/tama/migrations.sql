-- InsForge / Postgres migration for Tama. Run against your InsForge project.
-- All tables are user-scoped with RLS: users can only read/write their own
-- rows, except tama_profiles which allows friends to read (name/pet only)
-- and tama_invite_codes which allows lookup by code.

-- Enable auth uid helper (InsForge exposes auth.uid() like Supabase).

CREATE TABLE IF NOT EXISTS public.tama_profiles (
  user_id uuid PRIMARY KEY,
  user_name text NOT NULL DEFAULT 'sam',
  pet_name text NOT NULL DEFAULT 'pocket',
  sprite_tint text NOT NULL DEFAULT 'default',
  shell_theme text NOT NULL DEFAULT 'classic',
  overlay_shape text NOT NULL DEFAULT 'shell',
  overlay_size text NOT NULL DEFAULT 'm',
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- If upgrading, add the new columns:
ALTER TABLE public.tama_profiles ADD COLUMN IF NOT EXISTS shell_theme text NOT NULL DEFAULT 'classic';
ALTER TABLE public.tama_profiles ADD COLUMN IF NOT EXISTS overlay_shape text NOT NULL DEFAULT 'shell';
ALTER TABLE public.tama_profiles ADD COLUMN IF NOT EXISTS overlay_size text NOT NULL DEFAULT 'm';
ALTER TABLE public.tama_profiles ADD COLUMN IF NOT EXISTS bond integer NOT NULL DEFAULT 0;
ALTER TABLE public.tama_profiles ADD COLUMN IF NOT EXISTS evolution_stage integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.tama_wellbeing (
  user_id uuid PRIMARY KEY,
  rest int NOT NULL DEFAULT 60,
  body int NOT NULL DEFAULT 60,
  spark int NOT NULL DEFAULT 55,
  sprite_state text NOT NULL DEFAULT 'idle',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tama_consent (
  user_id uuid PRIMARY KEY,
  memory_enabled boolean NOT NULL DEFAULT true,
  pet_signals_enabled boolean NOT NULL DEFAULT true,
  proactive_enabled boolean NOT NULL DEFAULT true,
  sound_enabled boolean NOT NULL DEFAULT false,
  reduced_motion boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.tama_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inference_id text NOT NULL,
  category text NOT NULL,
  statement text NOT NULL,
  source_text text,
  source_date timestamptz,
  confidence text,
  user_confirmed boolean DEFAULT false,
  user_corrected boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tama_memory_user_idx ON public.tama_memory(user_id);

CREATE TABLE IF NOT EXISTS public.tama_positive_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memory_id text NOT NULL,
  kind text NOT NULL,
  note text,
  at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tama_positive_user_idx ON public.tama_positive_memories(user_id);

CREATE TABLE IF NOT EXISTS public.tama_invite_codes (
  code text PRIMARY KEY,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tama_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS tama_friends_user_idx ON public.tama_friends(user_id);

CREATE TABLE IF NOT EXISTS public.tama_pet_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  text text NOT NULL,
  at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tama_signals_to_idx ON public.tama_pet_signals(to_user);

-- Row-level security.
ALTER TABLE public.tama_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_wellbeing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_positive_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tama_pet_signals ENABLE ROW LEVEL SECURITY;

-- Own-row policies.
CREATE POLICY "own_profile_rw"      ON public.tama_profiles          USING (user_id = auth.uid())  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_wellbeing_rw"    ON public.tama_wellbeing         USING (user_id = auth.uid())  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_consent_rw"      ON public.tama_consent           USING (user_id = auth.uid())  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_memory_rw"       ON public.tama_memory            USING (user_id = auth.uid())  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_positive_rw"     ON public.tama_positive_memories USING (user_id = auth.uid())  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_friends_rw"      ON public.tama_friends           USING (user_id = auth.uid())  WITH CHECK (user_id = auth.uid());

-- Invite codes: owner can create/delete; anyone signed in can read to redeem.
CREATE POLICY "invite_read_any"     ON public.tama_invite_codes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "invite_owner_write"  ON public.tama_invite_codes FOR ALL    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Friend profiles: paired friends can read each other's profile (name + pet + tint ONLY).
CREATE POLICY "friend_profile_read" ON public.tama_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tama_friends f WHERE f.user_id = auth.uid() AND f.friend_id = tama_profiles.user_id)
  );

-- Pet signals: only sender writes; only recipient reads.
CREATE POLICY "signals_send"        ON public.tama_pet_signals FOR INSERT WITH CHECK (from_user = auth.uid());
CREATE POLICY "signals_read"        ON public.tama_pet_signals FOR SELECT USING (to_user = auth.uid());
