-- Public permalinks for extractions.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT ACCOMPANIES IT. POST /api/skills
-- writes share_id, so the column must exist first or saving skills will fail.
--
-- share_id groups the rows written by a single extraction, which is what a
-- "shared extraction" is -- the skills table has no batch entity of its own, so
-- every row from one POST /api/skills call carries the same id. It is therefore
-- deliberately NOT unique per row.
--
-- Rows that predate this migration keep share_id NULL and is_public false, so
-- nothing that already exists becomes publicly reachable. No backfill is wanted.

alter table skills add column if not exists share_id text;
alter table skills add column if not exists is_public boolean not null default false;

-- The public page looks rows up by share_id on every request; without this the
-- lookup is a sequential scan over every skill in the table.
create index if not exists skills_share_id_idx on skills (share_id);

-- Only public rows are ever served anonymously; this keeps that filter cheap.
create index if not exists skills_share_id_public_idx
  on skills (share_id)
  where is_public;
