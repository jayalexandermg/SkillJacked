---
name: claude-code-context-management-with-compact
description: Optimize Claude Code performance by managing conversation history and context usage with the /compact command. Trigger when chat becomes too long, response quality degrades, or token usage becomes excessive. Use /compact to clear history while preserving essential context through intelligent summarization.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Context Management with Compact Command

Manage conversation history and optimize token usage while preserving essential context.

## Quick Start
When your Claude Code chat becomes sluggish or responses degrade, type `/compact` to compress conversation history into a concise summary.

## Core Workflow

**Trigger: When conversation context becomes unwieldy**
1. Monitor for performance degradation signals:
   - Slower response times
   - Context limit warnings
   - Repetitive or confused responses
   - Chat window becoming excessively long

2. Execute compact command:
   - Type `/compact` in the chat
   - Claude automatically summarizes conversation history
   - Essential context is preserved in compressed form
   - Chat history is cleared while maintaining continuity

3. Verify context preservation:
   - Check that key project details remain accessible
   - Confirm ongoing tasks are still understood
   - Test that previous decisions/patterns are retained

## Techniques

**Proactive Context Management:**
- ALWAYS compact before starting major new features
- ALWAYS compact when switching between different project areas
- ALWAYS compact when conversation exceeds ~50 exchanges

**Context Preservation Validation:**
- After compacting, reference a key previous decision to verify retention
- Ask Claude to confirm understanding of current project state
- Test continuity by requesting follow-up on previous work

## Anti-Patterns

- NEVER compact in the middle of complex debugging sessions
- NEVER compact when Claude is actively referencing specific earlier code snippets
- NEVER rely solely on compact for long-term project memory (use project documentation)

## Edge Cases & Error Handling

**When Compact Fails to Preserve Critical Context:**
- Manually re-establish key context points after compacting
- Keep separate documentation for complex project requirements
- Re-share critical code snippets if Claude loses reference

**Performance Still Poor After Compacting:**
- Consider breaking complex tasks into smaller conversations
- Start fresh conversation for major context shifts
- Export important code/decisions before starting new chat