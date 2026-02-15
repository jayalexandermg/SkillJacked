---
name: parallel-agent-research-verification
description: Uses parallel agent workflows to prevent hallucinations in research tasks by implementing concurrent verification loops. Triggers when AI agents produce incorrect information despite having sources, or when research quality degrades due to repeated manual corrections. Apply for fact-checking, source verification, and research accuracy improvement.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Parallel Agent Research Verification

Prevent AI hallucinations in research by deploying parallel verification agents that cross-check facts and sources concurrently.

## Quick Start
When your research agent produces incorrect information despite having sources, deploy a parallel verification agent to fact-check claims in real-time while the primary agent continues working.

## Core Workflow

### Trigger: Research Quality Degradation
When you notice:
- Agent hallucinating facts despite provided sources
- Repeated manual corrections needed
- Research feeling "pointless" due to constant fixes

### Setup Process
1. **Identify Parallelizable Tasks** - Separate research generation from verification
2. **Deploy Primary Research Agent** - Handles main research and comparison tasks
3. **Launch Verification Agent in Parallel** - Cross-checks facts and sources simultaneously
4. **Configure Auto-Detection Override** - Even though Claude detects parallel opportunities, explicitly structure parallel workflows

### Execution Pattern
1. Research agent generates content
2. Verification agent validates claims against sources concurrently
3. Both agents communicate findings
4. Corrections happen in real-time rather than post-generation

## Techniques

### Parallelization Structure
- **ALWAYS** separate fact-generation from fact-checking into parallel streams
- **ALWAYS** provide same sources to both research and verification agents
- **ALWAYS** configure explicit parallel workflows even when Claude auto-detects opportunities

### Verification Loops
- Run verification continuously during research, not after completion
- Cross-reference multiple sources per claim
- Flag discrepancies immediately for human review

## Anti-Patterns

### Sequential Verification
- **NEVER** wait until research completion to verify facts
- **NEVER** rely solely on single-agent self-correction for factual accuracy
- **NEVER** ignore repeated hallucinations without implementing parallel verification

### Resource Mismanagement
- **NEVER** skip parallelization due to token cost concerns when accuracy is critical
- **NEVER** assume Claude's automatic parallel detection covers all verification needs

## Edge Cases & Error Handling

### Source Conflicts
- When verification agent finds contradictory sources, escalate to human review
- Maintain source hierarchy (primary vs secondary sources)
- Document conflicting information rather than choosing arbitrarily

### Token Usage Management
- Monitor increased token consumption from parallel agents
- Balance speed gains against cost implications
- Consider parallel workflows essential investment for accuracy-critical research

## Bundled Resources Plan

- `scripts/parallel_research_setup.py` - Template for deploying research + verification agent pairs
- `references/verification_prompts.md` - Proven prompts for fact-checking agents
- `assets/source_hierarchy_templates.json` - Source prioritization configurations