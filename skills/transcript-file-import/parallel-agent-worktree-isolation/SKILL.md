---
name: parallel-agent-worktree-isolation
description: Isolates AI agents using Git worktrees instead of branches to prevent file conflicts when multiple agents develop different features simultaneously. Trigger when coordinating multiple AI agents on the same codebase or when agents report merge conflicts from parallel development work.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Parallel Agent Worktree Isolation

Use Git worktrees to isolate AI agents working on different features simultaneously, preventing file conflicts and merge issues.

## Quick Start
```bash
# Create separate worktrees for each agent/feature
git worktree add ../agent-1-feature-auth feature/auth
git worktree add ../agent-2-feature-ui feature/ui
# Assign each agent to its dedicated worktree directory
```

## Core Workflow

**When coordinating multiple AI agents on the same codebase:**

1. **Create isolated worktrees** — Generate separate working directories for each agent/feature using `git worktree add`
2. **Assign agents to worktrees** — Direct each agent to work exclusively within its designated worktree directory  
3. **Provide feature-specific prompts** — Give each agent clear scope boundaries for their assigned feature
4. **Merge outputs sequentially** — Combine completed work from each worktree after agents finish their tasks
5. **Clean up worktrees** — Remove temporary worktrees after successful merges

**Trigger:** Multiple agents need to modify the same codebase simultaneously or agents report file conflicts.

## Techniques

**Worktree Setup Pattern:**
- One worktree per agent per feature
- Use descriptive naming: `../agent-{id}-{feature-name}`
- Keep main working directory clean for coordination

**Agent Assignment:**
- Explicitly specify working directory paths in agent configurations
- Include worktree path in agent prompts
- Verify agents stay within their assigned directories

## Anti-Patterns

**NEVER use branches for parallel agents** — Branches share the same working directory, causing file conflicts when agents modify the same files simultaneously.

**NEVER allow agents to switch branches** — AI agents have difficulty with `git checkout` operations and branch management in shared working directories.

**NEVER merge incomplete work** — Only merge agent outputs after each agent completes its assigned feature scope.

## Edge Cases & Error Handling

**Conflict Detection:**
- Monitor for agents attempting to access files outside their worktree
- Check for agents trying to perform Git operations in wrong directories

**Cleanup Failures:**
- Remove worktrees manually if automated cleanup fails: `git worktree remove <path>`
- Handle orphaned worktree references with `git worktree prune`

**Agent Confusion:**
- Verify agent working directory before task assignment
- Include absolute paths in agent prompts to prevent navigation errors