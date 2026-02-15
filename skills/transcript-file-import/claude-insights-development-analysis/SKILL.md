---
name: claude-insights-development-analysis
description: Uses Claude Code's insights command to analyze past coding sessions, identify friction points and working patterns, then extract actionable improvements for future workflows. Trigger when experiencing repetitive issues, wanting to optimize AI development process, or needing to learn from previous coding sessions.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Claude Insights Development Analysis

Extract actionable workflow improvements from Claude Code session history using the insights command.

## Quick Start
Run `insights` command in Claude Code → Review generated report → Extract specific friction points → Convert insights to preventive prompts in claude.md.

## Core Workflow

**When experiencing repetitive AI development issues or wanting to optimize workflow:**

1. **Generate Insights Report**
   - Run the `insights` command in Claude Code
   - Specify time period for analysis
   - Wait for comprehensive session analysis

2. **Analyze Friction Points**
   - Focus on areas where sessions went wrong
   - Identify recurring problematic patterns
   - Note sessions that required manual intervention

3. **Extract Actionable Patterns**
   - Document specific scenarios that caused issues
   - Identify root causes of workflow breakdowns
   - Note successful patterns worth replicating

4. **Convert to Preventive Measures**
   - Create specific prompts for claude.md
   - Add workflow constraints for problematic scenarios
   - Document anti-patterns to avoid

## Techniques

**Friction Point Analysis:**
- ALWAYS prioritize sessions that required manual termination
- Focus on repetitive behaviors that caused delays
- Look for agent polling loops or infinite task repetition

**Prompt Creation from Insights:**
```
Example: Agent polling prevention
"When using multi-agent workflows, NEVER poll task lists indefinitely. 
Set maximum polling iterations to 3 before requiring human intervention."
```

**Integration Strategy:**
- Copy validated insights directly into claude.md
- Apply insights as project-specific constraints
- Build cumulative workflow improvements over time

## Anti-Patterns

**NEVER ignore session termination patterns** - These indicate critical workflow failures
**NEVER apply insights blindly** - Validate recommendations against your specific use cases
**NEVER skip documenting successful patterns** - Positive patterns are as valuable as friction points

## Edge Cases & Error Handling

**Insufficient Data:** If insights lack detail, extend analysis time period or wait for more session history
**Conflicting Patterns:** When insights contradict, prioritize most recent successful workflows
**Over-Optimization:** Avoid creating overly restrictive prompts that limit AI flexibility

## Bundled Resources Plan

- `scripts/insights-extractor.sh` - Automate insights command execution and report parsing
- `references/friction-patterns.md` - Common Claude Code friction points and solutions
- `templates/claude-md-improvements.md` - Template for converting insights to claude.md entries