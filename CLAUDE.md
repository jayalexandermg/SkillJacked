# SkillJack

## Execution Strategy Guidance

When the user gives a complex or multi-part task, proactively recommend the right execution strategy BEFORE starting work:

- **Single session**: Simple, sequential, or single-file tasks. Just do it.
- **Subagents** (default for parallel work): Independent tasks that don't need inter-agent discussion. Workers do focused work and return results. Token-efficient.
- **Agent teams** (rare): Only when agents need to actively debate, challenge, or iterate on each other's findings. The collaboration IS the value. High token cost.

If unsure, default to subagents — they cover 95% of parallel work at a fraction of the token cost.

The user can run `/teamcheck` to get a scored analysis of any task.

## Agent Team Rules

When working as part of an agent team:

### File Ownership
- **No two teammates may edit the same file.** The lead MUST assign clear file ownership when creating tasks. Each file is owned by exactly one teammate.
- If a teammate needs changes in a file owned by another teammate, they must message that teammate to request the change — never edit it directly.
- The lead should break work into tasks with non-overlapping file sets.

### Task Dependencies
- Use `addBlockedBy` on tasks that depend on other tasks completing first.
- Teammates must NOT start work on a blocked task. Check `blockedBy` before claiming.
- Sequential work (e.g., "build the schema, then build the API that uses it") must be modeled as dependent tasks, not parallel ones.
