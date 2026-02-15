---
name: claude-code-slash-commands
description: Master Claude Code's built-in slash commands for terminal access and system functions. Triggered when starting Claude Code sessions, needing to manage context, or requiring quick system operations. Essential for discovering available commands and optimizing workflow efficiency.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Master Claude Code Slash Commands

Discover and leverage Claude Code's powerful built-in terminal commands for efficient development workflow.

## Quick Start
Type `/` in Claude Code to see all available slash commands. Start with `/compact` to manage long conversations.

## Core Workflow

**When starting Claude Code sessions:**
1. Type `/` to explore available commands
2. Review the command list to understand capabilities
3. Bookmark frequently used commands for quick access

**When chat context becomes too large:**
1. Use `/compact` to summarize and clear history while preserving context
2. Add optional custom summarization instructions: `/compact focus on database optimization`
3. Continue conversation with reduced token usage

**When reviewing code security:**
1. Use `/security-review` on current branch
2. Review pending changes for security vulnerabilities
3. Address identified issues before committing

## Techniques

**Context Management Pattern:**
```
/compact focus on [specific area]
```
- Maintains conversation continuity
- Reduces token consumption
- Preserves key information

**Security Validation Pattern:**
```
/security-review
```
- Automated security analysis
- Branch-specific review
- Pre-commit validation

## Anti-Patterns

**NEVER:**
- Ignore available slash commands — missing powerful built-in functionality
- Let conversations grow indefinitely without compacting — wastes tokens and context
- Skip security reviews on sensitive code changes — introduces vulnerabilities

## Edge Cases & Error Handling

**Long conversation management:**
- Use `/compact` before hitting context limits
- Provide specific summarization focus for complex topics
- Monitor token usage in long sessions

**Command discovery:**
- Regularly check for new commands with `/`
- Experiment with less common commands
- Document personal command preferences

## Bundled Resources Plan
- `scripts/command-reference.md` - Complete slash command documentation with examples
- `scripts/context-management.sh` - Automated compact triggers based on conversation length