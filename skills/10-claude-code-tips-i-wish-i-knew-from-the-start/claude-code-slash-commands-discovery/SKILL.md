---
name: claude-code-slash-commands-discovery
description: Discovers all available slash commands in Claude Code by typing a forward slash in the terminal. Essential technique for beginners to understand the full command palette and workflow options. Triggered when starting with Claude Code or exploring available commands.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Slash Commands Discovery

Access the complete command palette by typing a forward slash in the terminal.

## Quick Start
1. Open Claude Code terminal
2. Type `/` (forward slash)
3. View all available slash commands

## Core Workflow

**When starting with Claude Code or exploring capabilities:**
1. Type `/` in the terminal
2. Browse the complete list of available commands
3. Select commands to understand their functions
4. Test key commands like `/compact` and `/security`

**When conversation gets long:**
1. Use `/compact` to clear conversation history while keeping summary
2. Optionally add custom summarization instructions: `/compact focus on error handling patterns`

## Techniques

### Command Discovery Pattern
- **Always** start exploration with `/` to see full palette
- **Use** slash commands instead of typing out full requests
- **Explore** available options before writing custom prompts

### Context Management
- **Use** `/compact` when chat history becomes unwieldy
- **Add** specific instructions: `/compact focus on [specific area]`
- **Apply** before hitting token limits to preserve important context

## Anti-Patterns

- **NEVER** assume you know all available commands without checking
- **NEVER** let conversations grow indefinitely without using `/compact`
- **NEVER** write long custom prompts when slash commands exist

## Edge Cases & Error Handling

- If slash command palette doesn't appear, ensure cursor is in terminal
- Some commands may require specific project contexts to be available
- Custom summarization in `/compact` is optional but improves focus