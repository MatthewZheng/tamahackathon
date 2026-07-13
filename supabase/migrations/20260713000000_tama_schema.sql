-- Tama backend schema.
-- No auth for the hackathon MVP: identity is a free-text "profile id" (e.g. "sam", "jamie")
-- passed from the client via ?user= and cached in localStorage. RLS is permissive by design —
-- this is a demo-scoped shortcut, not a production security posture.

create table if not exists profiles (
  id text primary key,
  display_name text not null,
  pet_name text not null default 'Pocket',
  created_at timestamptz not null default now()
);

create table if not exists wellbeing (
  profile_id text primary key references profiles(id) on delete cascade,
  rest int not null default 65,
  body int not null default 60,
  spark int not null default 55,
  sprite_state text not null default 'idle',
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  from_role text not null check (from_role in ('pocket', 'user')),
  text text not null,
  at timestamptz not null default now()
);
create index if not exists conversation_messages_profile_idx on conversation_messages(profile_id, at desc);

create table if not exists inferences (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  category text not null,
  statement text not null,
  source_text text,
  source_date timestamptz not null default now(),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  user_confirmed boolean not null default false,
  user_corrected boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inferences_profile_idx on inferences(profile_id, is_active);

create table if not exists consent (
  profile_id text primary key references profiles(id) on delete cascade,
  memory_enabled boolean not null default true,
  pet_signals_enabled boolean not null default true,
  proactive_enabled boolean not null default true,
  sound_enabled boolean not null default false,
  reduced_motion boolean not null default false
);

-- Pocket -> Biscuit style signals, shown in "the yard". Never contains private text.
create table if not exists pet_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  reason text not null,
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Friend -> friend nudges ("thinking of you"). This is the real social feature:
-- one row here, read live by the other browser tab via Realtime.
create table if not exists nudges (
  id uuid primary key default gen_random_uuid(),
  from_profile text not null references profiles(id) on delete cascade,
  to_profile text not null references profiles(id) on delete cascade,
  text text not null default 'thinking of you 👋',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists nudges_to_profile_idx on nudges(to_profile, resolved);

-- Crisis events are logged with zero message content — count/timestamp only,
-- for demo/audit purposes. Never store the triggering text server-side.
create table if not exists crisis_events (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table wellbeing enable row level security;
alter table conversation_messages enable row level security;
alter table inferences enable row level security;
alter table consent enable row level security;
alter table pet_signals enable row level security;
alter table nudges enable row level security;
alter table crisis_events enable row level security;

-- Permissive demo policies: anyone with the anon key can read/write any row.
-- Fine for a same-day hackathon demo; would need real auth before any real launch.
create policy "demo_all_profiles" on profiles for all using (true) with check (true);
create policy "demo_all_wellbeing" on wellbeing for all using (true) with check (true);
create policy "demo_all_messages" on conversation_messages for all using (true) with check (true);
create policy "demo_all_inferences" on inferences for all using (true) with check (true);
create policy "demo_all_consent" on consent for all using (true) with check (true);
create policy "demo_all_pet_signals" on pet_signals for all using (true) with check (true);
create policy "demo_all_nudges" on nudges for all using (true) with check (true);
create policy "demo_all_crisis_events" on crisis_events for all using (true) with check (true);

alter publication supabase_realtime add table nudges;
alter publication supabase_realtime add table pet_signals;

-- Seed the two demo profiles so the yard has someone to talk to on first load.
insert into profiles (id, display_name, pet_name) values
  ('sam', 'Sam', 'Pocket'),
  ('jamie', 'Jamie', 'Biscuit')
on conflict (id) do nothing;

insert into wellbeing (profile_id) values ('sam'), ('jamie')
on conflict (profile_id) do nothing;

insert into consent (profile_id) values ('sam'), ('jamie')
on conflict (profile_id) do nothing;
