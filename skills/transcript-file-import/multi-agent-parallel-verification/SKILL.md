---
name: multi-agent-parallel-verification
description: Creates parallel agent systems where one agent performs tasks while another fact-checks and verifies the work, preventing hallucinations and errors through adversarial collaboration. Use when research tasks or content generation require accuracy validation. Trigger: "fact-check", "verify research", "parallel agents", "adversarial validation".
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Multi-Agent Parallel Verification

Implement parallel agent verification where one agent performs tasks while another critically analyzes and fact-checks the output in real-time.

## Quick Start
Set up two agents: Agent A performs research/task, Agent B fact-checks Agent A's output. Both communicate to ensure accuracy before final delivery.

## Core Workflow

### When research or content generation keeps producing errors:
1. **Split into parallel roles**
   - Primary Agent: Performs the main task (research, writing, analysis)
   - Verification Agent: Fact-checks, validates sources, identifies inconsistencies

2. **Establish adversarial communication**
   - Primary agent shares findings with verification agent
   - Verification agent challenges claims and checks sources
   - Both agents iterate until consensus reached

3. **Configure parallel execution**
   - ALWAYS run both agents simultaneously when possible
   - Let Claude detect parallelization opportunities automatically
   - Accept increased token usage for accuracy gains

### Task Distribution Pattern:
```
Research Agent: "Find capabilities comparison between X and Y"
Fact-Check Agent: "Verify all claims from Research Agent using provided sources"
Communication: Both agents share findings and resolve discrepancies
```

## Techniques

### Adversarial Setup
- **Role Opposition**: One agent advocates, other challenges
- **Source Cross-Validation**: Verification agent checks all citations
- **Real-time Feedback**: Agents communicate during task execution, not just at end

### Communication Protocol
- Primary agent presents findings with sources
- Verification agent identifies potential errors or gaps
- Both agents discuss discrepancies before finalizing
- Final output requires agreement from both agents

## Anti-Patterns

### NEVER rely on single agent for accuracy-critical tasks
- Single agents hallucinate facts even with sources provided
- Manual correction becomes repetitive and defeats automation purpose

### NEVER ignore token cost vs accuracy trade-off
- Parallelization increases token usage significantly
- But manual correction effort often exceeds token costs

### NEVER skip source validation
- Verification agent must check actual sources, not just claims
- Both agents must reference same source material

## Edge Cases & Error Handling

### When agents disagree persistently:
- Require both agents to cite specific sources for disputed claims
- Escalate to human review for final decision
- Document disagreement points for future reference

### When parallelization fails:
- Fall back to sequential verification
- Primary agent completes task, then verification agent reviews
- Maintain adversarial relationship even in sequential mode

### Source availability issues:
- Verification agent flags when sources are inaccessible
- Both agents work with available materials and document limitations
- Primary agent provides alternative sources when possible

## Bundled Resources Plan
- `templates/agent-roles.md` - Role definitions for primary and verification agents
- `prompts/adversarial-setup.txt` - Communication protocols between agents
- `scripts/parallel-task-config.py` - Configuration for parallel agent execution