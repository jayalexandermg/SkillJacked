-- Every jack is stored; the library holds only the skills a user chooses to save.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT ACCOMPANIES IT. /api/jack writes
-- jacks and jack_skills on every extraction, so without these tables every
-- jack fails. Safe to re-run.
--
-- Why store every jack: saving became opt-in, and a user who spent one of their
-- monthly videos must never lose the results because they didn't click Save.
-- Unsaved results stay reachable under "Recent jacks".
--
-- Why store anonymous jacks: signed-out visitors are only sent the skills
-- their tier allows (1 full, 3 name + description, the rest name only). The
-- full results wait here until they sign up and claim the jack with the token
-- only their browser holds (we keep a SHA-256 of it, never the token).
-- Unclaimed anonymous jacks are deleted by /api/jack after 7 days.

create table if not exists jacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  claim_token_hash text,
  share_id text not null unique,
  source_title text,
  source_url text,
  source_video_id text,
  source_channel text,
  created_at timestamptz not null default now()
);

create index if not exists jacks_user_created_idx on jacks (user_id, created_at desc);
create index if not exists jacks_anonymous_created_idx on jacks (created_at) where user_id is null;

create table if not exists jack_skills (
  id uuid primary key default gen_random_uuid(),
  jack_id uuid not null references jacks(id) on delete cascade,
  position integer not null,
  name text not null,
  description text,
  content text not null,
  -- Set when the skill is saved to the library. Deleting the library copy
  -- clears it, so the skill falls back to "Recent jacks" instead of vanishing.
  saved_skill_id uuid references skills(id) on delete set null,
  unique (jack_id, position)
);

alter table skills add column if not exists jack_id uuid references jacks(id) on delete set null;
-- Already in the documented schema; guarded in case an early database predates it.
alter table skills add column if not exists description text;

-- Usage is reserved in one conditional UPDATE, so parallel requests can't all
-- pass a separate "check then increment" and exceed the limit. A failed or
-- zero-skill jack gives its reservation back with refund_jack.
create or replace function reserve_jack(p_user_id uuid, p_period_start timestamptz)
returns boolean
language sql
as $$
  with reserved as (
    update usage
       set jacks_used = jacks_used + 1
     where user_id = p_user_id
       and period_start = p_period_start
       and jacks_used < jacks_limit
    returning 1
  )
  select exists (select 1 from reserved);
$$;

create or replace function refund_jack(p_user_id uuid, p_period_start timestamptz)
returns void
language sql
as $$
  update usage
     set jacks_used = greatest(jacks_used - 1, 0)
   where user_id = p_user_id
     and period_start = p_period_start;
$$;
