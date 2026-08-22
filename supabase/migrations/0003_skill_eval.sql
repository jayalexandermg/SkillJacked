-- On-demand skill evaluation.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT ACCOMPANIES IT. POST
-- /api/skills/:id/eval writes every column below.
--
-- Results are persisted so a return visit renders the previous verdict instead
-- of silently re-running three model calls and re-charging for them. Re-testing
-- is an explicit action.
--
-- skill_label records which side of the blind A/B the skill output was shown
-- as. Without it a stored verdict cannot be interpreted at all -- the same
-- verdicts mean "the skill helped a lot" or "the skill hurt a lot" depending
-- entirely on that mapping.

alter table skills add column if not exists eval_score real;
alter table skills add column if not exists eval_run_at timestamptz;
alter table skills add column if not exists test_prompt text;
alter table skills add column if not exists baseline_output text;
alter table skills add column if not exists skill_output text;
alter table skills add column if not exists eval_reasoning text;
alter table skills add column if not exists skill_label text;
