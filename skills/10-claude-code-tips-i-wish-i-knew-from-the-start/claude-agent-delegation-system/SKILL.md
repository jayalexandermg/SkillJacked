---
name: claude-agent-delegation-system
description: Creates and manages specialized Claude agents for delegated tasks with their own context windows. Triggered when needing domain-specific expertise (marketing, UX, planning, etc.) or when wanting to parallelize different types of work. Use "use the agent [name]" to invoke agents that work independently like employees with custom instructions.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Agent Delegation System

Create specialized Claude agents that work independently in their own context windows for domain-specific tasks.

## Quick Start
```
use the agent brand copywriter to generate five headline ideas for a coffee shop website
```

## Core Workflow

**When you need specialized expertise or want to delegate specific tasks:**

1. **Access agents menu** → Navigate to agents section in Claude interface
2. **Invoke agent** → Use "use the agent [agent-name]" command in chat
3. **Agent activates** → Subagent appears in different color, working in isolated context
4. **Receive results** → Agent returns with specialized output and reasoning
5. **Exit back** → Hit 'exit' to return to main chat context

**When creating new agents:**
1. Ask Claude: "what kind of agents do you recommend I create?"
2. Create agents for specific domains (UX/UI, planning, marketing, etc.)

## Techniques

### Agent Invocation Patterns
- **Direct command**: "use the agent [name] to [specific task]"
- **Implicit invocation**: Natural language that implies need for specialized agent
- **Parallel processing**: Spin up multiple instances of same agent type simultaneously

### Agent Specialization Areas
- Brand copywriter (headlines, marketing copy)
- UX/UI designer (interface design, user experience)
- Planning agent (project organization, strategy)
- Technical specialist agents (domain-specific coding, architecture)

### Context Management
- Each agent operates in isolated context window
- Main chat remains separate from agent work
- Agents can maintain their own conversation threads

## Anti-Patterns

**NEVER** try to manage complex multi-domain tasks in single context when agents could specialize
**NEVER** forget that agents work independently - they don't share context with main chat
**NEVER** assume agents remember previous sessions - each invocation is fresh context

## Edge Cases & Error Handling

- **Agent not found**: Create agent first or verify agent name spelling
- **Context switching**: Use 'exit' command to cleanly return to main chat
- **Multiple agent coordination**: Results need manual integration in main context
- **Agent specialization overlap**: Define clear boundaries between agent roles