---
name: claude-security-review-commands
description: Use Claude's built-in security review slash command to audit code changes for vulnerabilities. Trigger when reviewing code modifications, checking security implications, or auditing application security. More reliable than ad-hoc security prompts.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Security Review Commands

Use Claude's dedicated slash commands for systematic security reviews instead of manual prompts.

## Quick Start
Type `/security` in Claude to trigger a structured security review of your current code or conversation context.

## Core Workflow

**When making code changes or reviewing security:**
1. Complete your code modifications
2. Use `/security` slash command instead of typing "do a security review"
3. Review the structured output focusing on identified vulnerabilities
4. Address flagged security issues before deployment

**When conversations get long:**
1. Use `/compact` to clear conversation history while maintaining summaries
2. Preserves context without bloating the conversation
3. Maintains security review capabilities on fresh context

## Techniques

**Security Review Pattern:**
- ALWAYS use `/security` slash command over manual "please review security" prompts
- The slash command provides more structured, comprehensive analysis
- Built-in security review is more reliable than ad-hoc requests

**Context Management:**
- Use `/compact` when conversations exceed reasonable length
- Maintains conversation continuity without context overflow
- Keeps security reviews focused on current state

## Anti-Patterns

- NEVER rely solely on manual "check security" prompts when slash commands are available
- NEVER let conversations grow indefinitely without using `/compact` - degrades review quality
- NEVER assume security is handled without explicit review step

## Edge Cases & Error Handling

**Long Conversation Context:**
- If security review seems incomplete, use `/compact` first to clear noise
- Re-run `/security` on condensed context for better focus

**Limited Context:**
- Security review quality depends on having relevant code in conversation
- Include complete functions/modules before running security review