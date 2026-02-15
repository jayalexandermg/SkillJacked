---
name: git-worktrees-parallel-development
description: Uses Git worktrees to enable multiple AI agents to work on different features simultaneously without conflicts. Triggered when implementing multiple features in parallel to maximize development speed. Each agent gets an isolated working directory while sharing the same repository history.
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
# Assign each agent to work in their dedicated directory
```

## Core Workflow

**When implementing multiple features in parallel:**

1. **Create Feature Branches**
   - Create separate branches for each feature/agent
   - Use descriptive naming: `feature-[name]` or `agent-[task]`

2. **Set Up Worktrees**
   - Run `git worktree add [path] [branch]` for each agent
   - Each agent gets isolated working directory
   - All share same repository history and .git data

3. **Assign Agent Workspaces**
   - Point each agent to their dedicated worktree directory
   - Agents work independently without file conflicts
   - Version control tracks all changes separately

4. **Monitor Progress**
   - Use `git worktree list` to view active worktrees
   - Check each branch progress independently
   - Agents can commit/push without interference

5. **Merge Outputs**
   - Review each feature branch when complete
   - Merge successful implementations back to main
   - Clean up worktrees with `git worktree remove [path]`

## Techniques

**Worktree Management:**
- Always use absolute or relative paths outside main repo
- Name worktrees descriptively: `../agent-auth`, `../agent-ui`
- Keep worktree count manageable (max 5-10 active)

**Agent Assignment:**
- Set each agent's working directory to their worktree path
- Configure agents to commit regularly with descriptive messages
- Use branch naming that matches agent tasks

## Anti-Patterns

**NEVER:**
- Create worktrees in subdirectories of main repo
- Let multiple agents work in same worktree
- Forget to clean up completed worktrees
- Mix manual work with agent work in same worktree

## Edge Cases & Error Handling

**Common Issues:**
- **Branch conflicts:** Ensure each worktree uses unique branch
- **Path conflicts:** Use absolute paths or consistent relative paths
- **Cleanup failures:** Force remove with `git worktree remove --force`
- **Agent confusion:** Always verify agent is working in correct directory

**Recovery:**
- List all worktrees: `git worktree list`
- Remove stuck worktree: `git worktree remove [path] --force`
- Prune orphaned references: `git worktree prune`

## Bundled Resources Plan
- scripts/setup-parallel-agents.sh - Automated worktree creation for common patterns
- scripts/merge-agent-outputs.sh - Safe merging workflow with conflict detection
- references/git-worktree-commands.md - Complete command reference and troubleshooting