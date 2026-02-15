---
name: git-worktrees-parallel-agent-development
description: Uses Git worktrees to enable multiple AI agents to work on different features simultaneously without conflicts. Deploy when implementing multiple features in parallel to maintain isolation and merge outputs cleanly. Trigger words: parallel development, multiple agents, feature isolation, concurrent work.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Git Worktrees for Parallel Agent Development

Enable multiple AI agents to work on different features simultaneously using Git worktrees for conflict-free parallel development.

## Quick Start
```bash
# Create separate worktrees for each agent/feature
git worktree add ../agent-feature-a feature-a
git worktree add ../agent-feature-b feature-b
# Assign each agent to its dedicated worktree
```

## Core Workflow

**When running multiple agents on different features:**

1. **Create isolated worktrees** — One worktree per agent/feature branch
2. **Assign agents to specific worktrees** — Each agent operates in its dedicated directory
3. **Track all agent work in version control** — Commit agent changes regularly
4. **Enable clean rollbacks** — Use Git history to revert incorrect agent implementations
5. **Merge outputs cleanly** — Combine completed features without conflicts

## Techniques

**Worktree Creation Pattern:**
```bash
git worktree add ../agent-[feature-name] [branch-name]
```

**Agent Assignment:**
- Assign each agent a specific worktree directory as working space
- Configure agent to only modify files within its assigned worktree
- Set agent's Git operations to target the correct branch

**Version Control Integration:**
- Commit agent changes with descriptive messages indicating which agent made changes
- Use branch naming convention: `agent-[agent-id]-[feature-name]`
- Tag significant milestones for easy rollback points

## Anti-Patterns

**NEVER assign multiple agents to the same worktree** — Creates merge conflicts and overwrites agent work.

**NEVER skip version control tracking** — Without Git history, you cannot revert incorrect agent implementations.

**NEVER merge without review** — Agent-generated code requires validation before integration.

## Edge Cases & Error Handling

**Worktree cleanup:** Remove completed worktrees with `git worktree remove` after merging.

**Branch conflicts:** If agents create conflicting changes, use Git merge tools to resolve before integration.

**Long-running tasks:** For extended agent operations, implement periodic commits to prevent work loss.