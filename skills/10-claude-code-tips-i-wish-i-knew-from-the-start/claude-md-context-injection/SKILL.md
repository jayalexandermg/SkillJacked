---
name: claude-md-context-injection
description: Create and use claude.md files to automatically inject custom instructions, code styles, and workflow rules into any Claude Code conversation. Triggers when you need consistent behavior across sessions or want to establish project-specific guidelines that Claude should always follow.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude.md Context Injection

Automatically inject custom instructions into Claude Code conversations using a special markdown file.

## Quick Start
Create `claude.md` in your project root with your rules. Claude automatically reads it when starting conversations in that folder.

## Core Workflow

**When starting a new project or wanting consistent Claude behavior:**
1. Create file named exactly `claude.md` in project root
2. Add custom instructions as plain markdown text
3. Include code styles, workflow rules, or project-specific context
4. Claude automatically pulls this context into every conversation in that folder

**When adding instructions:**
1. Write imperative rules: "Be sure to type check when done making code changes"
2. Include specific code styles and preferences
3. Add workflow steps Claude should always follow
4. Save file - takes effect immediately in new conversations

## Techniques

**Automated Creation:**
- Ask Claude: "Put X, Y, and Z into the claude.md file"
- Claude will create and populate the file automatically
- No manual file creation required

**Content Types:**
- Code style guidelines
- Testing requirements
- Workflow steps
- Project-specific context
- Error handling patterns

**External Resources:**
- Check GitHub for public claude.md templates
- Adapt existing files to your project needs

## Anti-Patterns

**NEVER:**
- Name the file anything other than exactly `claude.md`
- Place it anywhere except project root folder
- Expect it to work across different folder contexts
- Include sensitive information (it's readable by Claude)

## Edge Cases & Error Handling

**File Not Loading:**
- Verify exact filename: `claude.md` (lowercase, .md extension)
- Ensure file is in the folder where Claude Code is running
- Check file isn't corrupted or has encoding issues

**Context Window Limits:**
- Keep claude.md concise - it consumes context tokens
- Large files may hit context limits in conversations
- Prioritize most critical instructions if file gets long

## Bundled Resources Plan

- `templates/claude.md` - Starter template with common instructions
- `examples/` - Sample claude.md files for different project types
- `references/github-claude-md-repos.md` - Curated list of public claude.md files