-- Skill editing: keep the generated text so an edit is always reversible.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT ACCOMPANIES IT. PATCH
-- /api/skills/:id writes original_content and is_edited.
--
-- is_edited is declared here with "if not exists" because it may already be
-- present -- it is part of the documented schema but nothing in the codebase
-- has ever written it. Running this is safe either way.
--
-- original_content stays NULL until the first edit; it is populated from the
-- pre-edit content at that moment rather than backfilled for every existing
-- row, which would double the storage of the skills table to record an edit
-- that never happened. "Reset to original" is therefore only offered once an
-- edit exists to reset from.

alter table skills add column if not exists original_content text;
alter table skills add column if not exists is_edited boolean not null default false;

-- PATCH /api/skills/:id stamps updated_at. It is part of the documented schema,
-- but nothing in the codebase has ever written it, so its presence is asserted
-- here rather than assumed -- a missing column would fail every save.
alter table skills add column if not exists updated_at timestamptz;
