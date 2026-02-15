---
name: claude-code-insights-analysis
description: Analyzes past Claude Code sessions using the insights command to identify friction points, working patterns, and workflow improvements. Triggered when experiencing repeated workflow issues, session inefficiencies, or wanting to optimize AI development patterns. Use after accumulating multiple Claude Code sessions to extract actionable improvements.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Insights Analysis

Extract actionable workflow improvements from Claude Code session history using the insights command.

## Quick Start
Run `insights` command in Claude Code, identify top friction points, copy improvement prompts to claude.md for future sessions.

## Core Workflow

**When to trigger:** After accumulating multiple Claude Code sessions with recurring issues or inefficiencies.

1. **Generate Insights Report**
   - Run the `insights` command in Claude Code
   - Specify time period for analysis
   - Let Claude analyze all past sessions

2. **Identify Friction Points**
   - Focus on areas where sessions went wrong
   - Look for repeated patterns of failure
   - Note sessions that had to be manually terminated

3. **Extract Improvement Prompts**
   - Copy specific improvement suggestions from report
   - Focus on actionable behavioral changes
   - Document context-specific rules

4. **Import to claude.md**
   - Add extracted prompts to project claude.md files
   - Create conditional rules for specific scenarios
   - Ensure prompts prevent identified failure patterns

## Techniques

**Friction Analysis Pattern:**
- Target sessions that took too long or failed
- Identify repetitive inefficient behaviors
- Extract root cause patterns

**Multi-Agent Session Fix:**
```markdown
# In claude.md
When using multi-agent workflows:
- NEVER poll task lists indefinitely
- Set maximum polling iterations
- Act decisively on available information
```

**Prompt Integration Strategy:**
- Convert insights into imperative rules
- Make context-specific (e.g., "when using agent teams")
- Focus on preventing past failure modes

## Anti-Patterns

**NEVER** ignore insights about repeated failures - they indicate systemic workflow issues.

**NEVER** apply insights as generic advice - make them context-specific rules.

**NEVER** skip importing successful patterns - replicate what worked well.

## Edge Cases & Error Handling

**Insufficient Session History:** Wait until you have multiple sessions before running insights analysis.

**Vague Recommendations:** Convert general advice into specific behavioral rules with clear triggers.

**Context Loss:** Always document the specific scenario where each improvement applies.