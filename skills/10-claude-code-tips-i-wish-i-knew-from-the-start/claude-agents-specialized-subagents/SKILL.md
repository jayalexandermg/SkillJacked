---
name: claude-agents-specialized-subagents
description: Create specialized AI subagents with dedicated context windows and custom system prompts for focused tasks like marketing copy, UX design, or planning. Trigger when you need autonomous AI employees working independently on specific domains while maintaining separate conversation contexts. Use "agents" slash command or "use the agent [name]" to invoke.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Agents: Specialized Subagents

Create autonomous AI employees that work in isolated context windows for specialized tasks.

## Quick Start
```
/agents → create new agent → name: "brand-copywriter" → model: opus → color: purple → save
```
Then invoke: "use the agent brand copywriter to generate five headline ideas for a coffee shop website"

## Core Workflow

**When you need specialized expertise isolated from main conversation:**

1. **Create Agent**: `/agents` → "Create New Agent"
2. **Configure**: Set name, select model (opus recommended), assign color
3. **Save**: Agent becomes available across all Claude Code instances
4. **Invoke**: Either `/agents` to browse or directly "use the agent [name] to [task]"
5. **Monitor**: Subagent appears in different color, works in separate context window
6. **Scale**: Multiple agents can work simultaneously on different tasks

**Agent triggers main conversation when complete** - think of it as an employee going off to work independently and returning with results.

## Techniques

**Agent Naming Patterns:**
- `brand-copywriter` - Marketing copy generation
- `ux-ui-agent` - User experience design
- `planning-agent` - Project planning and strategy

**Multi-Agent Workflows:**
- Spin up multiple instances of same agent type
- Run different agent types simultaneously
- Each maintains separate context and memory

**Agent Recommendations:**
Ask Claude: "what kind of agents do you recommend I create?" for domain-specific suggestions.

## Anti-Patterns

**NEVER** expect agents to share context with main conversation - they work in isolation.

**NEVER** rely on agents remembering previous main chat history - their context window is independent.

## Edge Cases & Error Handling

**Agent Access**: Use `/agents` if direct invocation fails
**Context Isolation**: Agents cannot access your main conversation history
**Multiple Instances**: Same agent type can run multiple copies simultaneously
**Exit Shortcut**: Hit "exit" to return to main chat from agent view

## Bundled Resources Plan

`scripts/agent-templates.md` - Common agent configurations and naming conventions
`references/agent-use-cases.md` - Domain-specific agent examples and triggers