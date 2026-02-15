---
name: claude-code-essential-workflows
description: Master Claude Code's core capabilities including slash commands for context management, agents for specialized tasks, skills for reusable functionality, plan mode for structured development, and IDE integration. Use when starting with Claude Code or need to efficiently leverage its full development workflow potential. Trigger on "Claude Code setup", "development workflow", or "terminal AI coding".
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Essential Workflows

Master the fundamental Claude Code capabilities for efficient terminal-based AI development.

## Quick Start
Open terminal with Claude Code setup → Type `/` to see all available commands → Use `/compact` to manage context and `/agents` to create specialized helpers.

## Core Workflow

### Context Management
**When chat history gets long:**
1. Use `/compact` to clear conversation history while keeping summary in context
2. OPTIONALLY add custom summarization instructions: `/compact focus on security patterns`
3. Continue development with preserved context but reduced token usage

### Agent Creation and Management
**When you need specialized expertise:**
1. Use `/agents` to access agent management
2. Create new agent: describe the role (e.g., "marketer who writes amazing brand copy")
3. Configure agent settings:
   - Choose tools (read-only, full access, etc.)
   - Select model (Sonnet, Opus, Haiku)
   - Assign color for visual identification
4. Invoke agent in chat: "Use agent [name] to [specific task]"
5. Agent works in separate context window and returns results

### Skills vs Agents Decision Tree
**Use Skills when:**
- Need reusable functionality across all Claude Code instances
- Want to stack multiple capabilities in one workflow
- Working within current context window

**Use Agents when:**
- Need specialized "employee" with own context window
- Require custom system prompts and specific tools
- Want multiple agents working simultaneously on different tasks

### Plan Mode Activation
**When building complex applications:**
1. Use `Shift + Tab` to toggle plan mode ON
2. Describe your project requirements
3. Claude will ask clarifying questions before coding
4. Review and approve the plan
5. Only then will actual code generation begin

## Techniques

### Enhanced Thinking
- Use `ultra think` before complex prompts to make Claude process more thoroughly
- Results in rainbow-colored interface and deeper analysis
- Consumes more tokens but provides higher quality outputs

### IDE Integration Setup
1. Open Claude Code inside terminal within IDE (like Cursor)
2. Create project folder for Claude to access
3. All files become visible and editable in IDE interface
4. Use both Claude Code and IDE features in tandem

### Custom Configuration
**Create claude.md file in project root:**
```markdown
# Custom Instructions
- Always type check after code changes
- Follow [specific code style]
- Use [preferred frameworks]
- Include error handling patterns
```

### Skill Creation Process
1. Use `/skills` to list available skills
2. Create new skill: "create a skill that is a [description] using [best practices]"
3. Review generated skill structure and approve
4. Stack multiple skills: invoke several in one workflow

## Anti-Patterns

**NEVER:**
- Skip plan mode for complex applications - leads to scope creep
- Use agents for simple, single-context tasks - use skills instead
- Ignore context management with `/compact` - causes token bloat
- Create duplicate agents/skills - check existing ones first
- Forget to configure claude.md for project-specific needs

## Edge Cases & Error Handling

**Long Chat Sessions:**
- Monitor context length indicators
- Use `/compact` proactively before hitting limits
- Save important context in claude.md if repeatedly needed

**Agent Conflicts:**
- Multiple agents can work simultaneously but may have conflicting advice
- Clearly specify which agent should handle which aspects
- Use agent colors to track different workstreams

**Skill Stacking Issues:**
- Test individual skills before combining
- Ensure skills have compatible inputs/outputs
- Override conflicting skill instructions explicitly

**Plan Mode Confusion:**
- Always review the complete plan before approval
- Ask for modifications if requirements aren't captured
- Remember plan mode must be explicitly enabled per session

## Bundled Resources Plan
- `claude-configs/` - Sample claude.md templates for different project types
- `agent-templates/` - Pre-configured agent setups for common roles
- `skill-library/` - Curated skills for frequent development tasks
- `scripts/setup-ide.sh` - IDE integration setup automation