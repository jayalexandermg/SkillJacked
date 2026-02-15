---
name: claude-code-context-management
description: Set up reusable context and configuration for Claude Code using claude.md files and IDE workspace organization. Apply when starting new Claude Code projects or when you need consistent behavior across coding sessions. Trigger on: "new project setup", "context management", "claude.md", "workspace organization".
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Context Management

Organize workspaces and configure persistent context using claude.md files for consistent Claude Code behavior.

## Quick Start
Create a `claude.md` file in your project root with custom instructions like "ALWAYS type check after code changes" to automatically inject context into every Claude Code session.

## Core Workflow

### When starting a new Claude Code project:
1. Create dedicated project folder 
2. Open folder in IDE (Cursor recommended over terminal)
3. Create `claude.md` file in project root
4. Add custom instructions, code styles, and workflows to claude.md
5. Claude automatically pulls this context for every conversation

### When configuring persistent context:
1. Identify recurring instructions you give Claude
2. Convert to imperative statements in claude.md
3. Include code style preferences, workflow requirements, testing protocols
4. Let Claude auto-reference this file in all sessions

## Techniques

### claude.md Content Structure:
```markdown
# Custom Instructions
- ALWAYS type check after making code changes
- Use consistent naming conventions: camelCase for variables
- Include error handling in all functions
- Write unit tests for new features

# Workflow Requirements  
- Create plan.md file for complex features
- Commit changes in logical chunks
- Document API endpoints in README
```

### IDE Workspace Benefits:
- Visual file tree navigation
- Direct code inspection without terminal commands
- Easy access to generated files and folders
- Better overview of project structure

## Anti-Patterns

- NEVER rely solely on terminal for Claude Code projects - IDE provides essential visual context
- NEVER repeat the same instructions manually across sessions - use claude.md instead  
- NEVER create claude.md files without specific, actionable instructions
- NEVER ignore existing community claude.md templates on GitHub

## Edge Cases & Error Handling

- If claude.md not working: Ensure file is in project root and properly formatted
- If instructions ignored: Make instructions more specific and imperative
- If context too large: Split into focused, topic-specific instructions
- If conflicting with session instructions: Session instructions override claude.md

## Bundled Resources Plan

- `templates/claude.md` - Sample claude.md templates for different project types
- `references/github-claude-configs.md` - Links to community claude.md examples  
- `scripts/setup-workspace.sh` - Automated project folder and claude.md creation