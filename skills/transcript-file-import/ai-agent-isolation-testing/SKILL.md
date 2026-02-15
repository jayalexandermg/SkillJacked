---
name: ai-agent-isolation-testing
description: Implements isolated work tree testing for AI agents with strict error checking. Triggered when developing multi-agent systems or testing agent implementations. Use when agents have overlapping tasks but need independent validation before integration.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# AI Agent Isolation Testing

Isolate AI agents in separate work trees with strict error checking to prevent runtime failures and enable safe feature integration.

## Quick Start
```bash
# Create isolated work trees for each agent
git worktree add ../agent-1-feature feature-branch-1
git worktree add ../agent-2-feature feature-branch-2
# Enable strict mode in each environment
```

## Core Workflow

**When deploying multiple AI agents with overlapping tasks:**

1. **Create Separate Work Trees**
   - Assign each agent to its own git work tree
   - Implement features in complete isolation
   - Prevent cross-contamination of agent outputs

2. **Enable Strict Mode**
   - Set language-specific strict mode (TypeScript: `"strict": true`)
   - Shift error burden from runtime to build time
   - Catch bugs before user interaction

3. **Isolated Implementation**
   - Let each agent complete its task independently
   - Allow task description overlap without interference
   - Validate each implementation separately

4. **Merge Integration**
   - After all agents complete successfully
   - Merge outputs into single working directory
   - Combine all features into unified codebase

## Techniques

**Work Tree Isolation Pattern:**
```bash
git worktree add ../agent-{id}-{feature} {branch-name}
```

**TypeScript Strict Mode Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Agent Task Separation:**
- One agent = One work tree = One feature branch
- Complete isolation until merge phase
- Independent validation pipelines

## Anti-Patterns

**NEVER allow agents to work in shared directories** - Causes output contamination and debugging nightmares.

**NEVER skip strict mode setup** - Runtime errors from AI agents are harder to debug than build-time catches.

**NEVER merge before individual validation** - Unvalidated agent outputs create integration hell.

## Edge Cases & Error Handling

**Overlapping Task Descriptions:**
- Expected behavior - let agents implement independently
- Merge conflicts resolved during integration phase
- Duplicate implementations get deduplicated post-merge

**Strict Mode Violations:**
- Build failures indicate agent implementation issues
- Fix in isolation before attempting merge
- Prefer build-time errors over runtime surprises

**Work Tree Management:**
- Clean up work trees after successful merge
- Handle work tree corruption with fresh checkouts
- Monitor disk space with multiple work trees

## Bundled Resources Plan

- `scripts/setup-agent-worktrees.sh` - Automated work tree creation for agent isolation
- `configs/strict-mode-templates/` - Language-specific strict mode configurations
- `scripts/merge-agent-outputs.sh` - Safe merge workflow for validated agent implementations