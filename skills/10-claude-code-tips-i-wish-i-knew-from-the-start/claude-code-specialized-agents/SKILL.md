---
name: claude-code-specialized-agents
description: Create and deploy specialized AI agents with dedicated context windows, custom tools, and specific expertise areas. Triggered when needing focused AI assistance for distinct domains like marketing, UX design, or planning. Agents work independently and can run multiple instances simultaneously.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Specialized Agents

Create dedicated AI agents with their own context windows and tools for specific expertise domains.

## Quick Start
Type "use the agent [agent-name]" followed by your specific request to invoke a specialized agent for focused assistance.

## Core Workflow

### Agent Creation
When you need dedicated expertise for a specific domain:

1. **Initialize Agent**: Create new agent via interface
2. **Configure Tools**: Select read-only tools or custom toolset based on needs
3. **Set Power Level**: Choose Sonnet, Opus, or Haiku based on complexity requirements
4. **Assign Identity**: Give descriptive name and visual identifier (color)
5. **Save Configuration**: Agent becomes permanently available

### Agent Invocation
When you need specialized assistance within an existing chat:

1. **Direct Command**: Type "use the agent [agent-name]" + specific task
2. **Context Isolation**: Agent operates in separate context window (different color UI)
3. **Independent Operation**: Agent works like "an employee going off and working in its own space"
4. **Result Integration**: Agent returns findings to main chat thread

### Multi-Agent Orchestration
When complex tasks require multiple perspectives:

1. **Parallel Deployment**: Spin up multiple agents simultaneously
2. **Same-Type Scaling**: Create multiple instances of same agent type
3. **Cross-Domain Coordination**: Combine different agent types (UX + marketing + planning)

## Techniques

### Agent Specialization Patterns
- **Domain-Specific Naming**: "brand copywriter", "UX UI agent", "planning agent"
- **Task-Specific Requests**: "generate five headline ideas for a coffee shop website"
- **Contextual Handoffs**: Use agents mid-conversation without losing main thread context

### Access Shortcuts
- **Slash Command**: Type `/agents` to access agent directory
- **Exit Command**: Hit "exit" to return to main chat from agent context
- **Agent Discovery**: Ask Claude "what kind of agents do you recommend I create?"

## Anti-Patterns

- **NEVER** rely on agents for tasks that don't require specialized context isolation
- **NEVER** create agents without clear domain boundaries
- **AVOID** using agents for simple queries that work fine in main context

## Edge Cases & Error Handling

### Agent Context Management
- Agents maintain separate context windows - information doesn't automatically transfer between main chat and agent
- Multiple same-type agents can run independently without interference
- Agent responses integrate back into main thread while preserving context separation

### Power Level Selection
- Choose appropriate model tier (Haiku/Sonnet/Opus) based on task complexity
- Higher tiers consume more resources but provide better specialized reasoning

## Bundled Resources Plan
- `scripts/agent-templates.md` - Pre-configured agent templates for common use cases
- `references/agent-best-practices.md` - Guidelines for effective agent specialization
- `examples/multi-agent-workflows.md` - Sample orchestration patterns