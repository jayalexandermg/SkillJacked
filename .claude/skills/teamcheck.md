---
name: teamcheck
description: Analyze a task and recommend whether to use subagents, agent teams, or a single session
user_invocable: true
---

# Task Execution Strategy Advisor

Analyze the user's task (or the most recent task discussed) and recommend the best execution strategy.

## Evaluation Criteria

Score each dimension 1-5, then recommend based on the totals:

### 1. Parallelism (Can parts run independently?)
- 1: Fully sequential, each step depends on the last
- 3: Some independent parts, some dependencies
- 5: Fully parallel, no dependencies between parts

### 2. Inter-agent discussion needed?
- 1: No — each part produces a standalone result
- 3: Some coordination — agents need to share findings occasionally
- 5: Heavy debate — agents need to challenge, iterate, and build on each other's work

### 3. File overlap risk
- 1: All work touches the same 1-2 files
- 3: Some shared files, but most are separate
- 5: Completely separate file sets per worker

### 4. Task complexity
- 1: Simple, single-step task
- 3: Multi-step but well-defined
- 5: Complex, ambiguous, requires exploration

### 5. Session persistence needed?
- 1: Do the work, return the result, done
- 3: Might need a follow-up round
- 5: Long-running, multi-turn work with evolving context

## Decision Matrix

**Single session** (total 5-10):
- Task is simple or fully sequential
- No benefit from parallelism
- Example: "Fix this bug", "Add a button", "Explain this code"

**Subagents** (total 11-18, AND inter-agent discussion ≤ 2):
- Parallel work is possible
- Each worker produces independent results
- Orchestrator can relay info between them if needed
- Token efficient — workers spin up, do work, return results, die
- Example: "Build 3 API endpoints", "Research these 4 libraries", "Run tests while I refactor"

**Agent teams** (total 19-25, OR inter-agent discussion ≥ 4):
- Workers need to actively debate, challenge, or build on each other's findings
- The conversation between agents IS the value
- Worth the higher token cost because collaboration improves the output
- Example: "Investigate this bug from 5 angles and debate causes", "Review this PR from security + performance + UX perspectives and challenge each other"

## Output Format

Present a clear, concise recommendation:

```
## Strategy: [Single Session / Subagents / Agent Teams]

**Scores:**
| Dimension | Score | Why |
|-----------|-------|-----|
| Parallelism | X/5 | ... |
| Inter-agent discussion | X/5 | ... |
| File overlap risk | X/5 | ... |
| Task complexity | X/5 | ... |
| Session persistence | X/5 | ... |
| **Total** | **X/25** | |

**Recommendation:** [Explain in 2-3 sentences why this strategy fits]

**Execution plan:** [Brief outline of how to structure the work]
```

If the recommendation is subagents, suggest how many and what each should do.
If the recommendation is agent teams, suggest team roles and structure.
If borderline, present both options with tradeoffs and let the user decide.
