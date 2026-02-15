---
name: setup-claude-md-context-files
description: Creates and configures claude.md files in IDE environments to provide persistent custom instructions and context for Claude Code. Triggered when setting up new projects, establishing coding standards, or needing consistent AI behavior across development sessions. Essential for IDE integrations like Cursor.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Setup Claude.md Context Files

Configure persistent AI context through claude.md files for consistent behavior in IDE environments.

## Quick Start
Create a `claude.md` file in your project root with custom instructions that Claude Code will automatically reference during all interactions.

## Core Workflow

### When Setting Up New Projects
1. Create `claude.md` file in project root directory
2. Add custom instructions covering:
   - Code style preferences
   - Workflow requirements
   - Project-specific context
3. Test by asking Claude to reference the instructions

### When Defining Code Standards
1. Include type-checking requirements: "Be sure to type check when you're done making a series of code changes"
2. Specify formatting preferences
3. Define error handling patterns
4. Document project architecture constraints

### When Managing Instructions
1. ALWAYS update claude.md when project requirements change
2. Ask Claude directly: "Put X, Y, and Z into the claude.md file"
3. Let Claude generate and maintain the file content

## Techniques

### Instruction Categories
- **Code Quality**: Type checking, linting rules, testing requirements
- **Workflow**: Build processes, deployment steps, review criteria
- **Style**: Formatting preferences, naming conventions, comment standards
- **Context**: Project goals, technical constraints, team preferences

### Automated Setup
- Use Claude to generate initial claude.md content
- Request specific additions: "Add [requirement] to claude.md"
- Have Claude maintain and update the file as needed

## Anti-Patterns

**NEVER** leave claude.md empty or generic - Claude Code will lack project context
**NEVER** forget to update claude.md when project requirements change
**NEVER** assume Claude remembers previous conversations - use claude.md for persistence

## Edge Cases & Error Handling

### Missing claude.md File
- Claude Code works without it but lacks project context
- Create one immediately when starting serious development

### Conflicting Instructions
- Later instructions in claude.md override earlier ones
- Keep instructions specific and non-contradictory
- Review periodically for consistency

## Bundled Resources Plan
- `templates/claude-md-starter.md` - Basic template with common instruction categories
- `examples/claude-md-samples/` - Real-world claude.md files from different project types
- `scripts/validate-claude-md.py` - Checker for common claude.md issues