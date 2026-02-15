---
name: claude-code-command-mastery
description: Master essential Claude Code terminal commands including slash commands, agent creation, skills management, security reviews, ultra think mode, plan mode, and IDE integration. Trigger when setting up Claude Code workflows, optimizing development processes, or needing comprehensive command reference. Apply for terminal-based AI development, code security, and workflow automation.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Command Mastery

Master the essential terminal commands and features for effective Claude Code development workflows.

## Quick Start
```bash
# In Claude Code terminal
/  # Shows all available commands
/compact  # Clear conversation history but keep summary
/security  # Review pending changes for security issues
```

## Core Workflow

**When starting any Claude Code session:**
1. Type `/` to see all available commands
2. Use `/compact [optional instructions]` when chat gets too long
3. Enable plan mode with `Shift+Tab` before complex builds
4. Create `claude.md` file in project root for persistent context

**When building complex applications:**
1. Use `/plan` or `Shift+Tab` to enable planning mode
2. Let Claude ask clarifying questions before coding
3. Accept the plan only when satisfied with approach

**When needing specialized help:**
1. Use `/agents` to create or access specialized sub-agents
2. Use `/skills` to apply reusable capabilities
3. Stack multiple skills for complex workflows

## Techniques

### Slash Commands (Essential Set)
- `/compact [instructions]` — Compress conversation history with optional focus
- `/security` — Security review of pending changes on current branch
- `/agents` — Create/manage specialized sub-agents with own context
- `/skills` — List/create/apply reusable capabilities
- `/plan` — Enable planning mode (alternative: `Shift+Tab`)

### Agent Creation Pattern
```
/agents
→ Create new agent
→ Describe role: "marketer who can help me write amazing brand copy"
→ Choose tools (read-only/full access)
→ Select model (Sonnet/Opus/Haiku)
→ Assign color
→ Save
```

### Agent Invocation
```
"Use the agent [agent-name] to [specific task]"
# Example: "Use the agent brand copywriter to generate five headline ideas for a coffee shop website"
```

### Skills vs Agents
- **Skills:** Work within current context window, stackable, reusable across sessions
- **Agents:** Own context window, own system prompt, work independently like employees

### Ultra Think Mode
Type `ultra think` before any prompt to make Claude use more tokens for deeper reasoning (shows rainbow color indicator).

### IDE Integration Setup
1. Open Claude Code terminal inside IDE (Cursor, VS Code, etc.)
2. Navigate to project folder
3. Claude automatically accesses all files in folder
4. Use both IDE features and Claude Code together

### Claude.md Configuration
Create `claude.md` in project root with:
```markdown
# Custom Instructions
- Always type-check after code changes
- Follow [specific coding style]
- Use [preferred frameworks]
- [Workflow preferences]
```

## Anti-Patterns

**NEVER:**
- Skip planning mode for complex applications — leads to unfocused development
- Let conversation history grow indefinitely — wastes tokens and context
- Create agents for simple, one-time tasks — use direct prompts instead
- Stack too many skills simultaneously — can create conflicting instructions
- Ignore the claude.md file — missing persistent context hurts consistency

## Edge Cases & Error Handling

**Long conversation degradation:**
- Use `/compact` when responses become less focused
- Include summarization instructions for domain-specific focus

**Agent context confusion:**
- Agents work in separate context windows — they don't see main conversation
- Always provide full context when invoking agents

**Skill conflicts:**
- When stacking skills, ensure they complement rather than contradict
- Test skill combinations on simple tasks first

**Plan mode confusion:**
- Plan mode prevents immediate code execution — accept plan to proceed
- Use `Shift+Tab` to toggle plan mode on/off

## Bundled Resources Plan
- `scripts/agent-templates.md` — Pre-configured agent templates for common roles
- `scripts/skill-library.md` — Curated skills for different development domains
- `references/claude-md-examples.md` — Sample claude.md configurations
- `references/slash-command-reference.md` — Complete slash command documentation