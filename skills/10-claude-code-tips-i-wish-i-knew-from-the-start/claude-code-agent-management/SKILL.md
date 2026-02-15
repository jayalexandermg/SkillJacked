---
name: claude-code-agent-management
description: Create, configure, and invoke specialized AI agents in Claude Code for delegated task execution. Agents work in isolated context windows with custom instructions and tools. Use when you need specialized expertise (marketing copy, security review, UI design) that should operate independently from your main conversation thread.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Agent Management

Create and manage specialized AI subagents that work independently with their own context windows and custom instructions.

## Quick Start
```
/agents
/agent create
# Describe agent purpose: "A marketer who can help me write amazing brand copy"
# Configure tools, model (sonnet/opus/haiku), and color
# Invoke: "Use the agent brand-copywriter to generate five headline ideas for a coffee shop website"
```

## Core Workflow

**When you need specialized expertise that should work independently:**

1. **Create Agent**
   - Run `/agent create` or `/agents` → create new
   - Describe agent role and capabilities in plain English
   - Select tools (read-only recommended for content creation)
   - Choose model power level (opus for complex tasks, sonnet for general use)
   - Assign identifying color

2. **Configure Agent Context**
   - Agent gets own system prompt based on your description
   - Agent inherits from parent but works in isolation
   - Each agent maintains separate conversation history

3. **Invoke Agent**
   - Use natural language: "Use the agent [name] to [specific task]"
   - Agent appears in different color to show it's working
   - Multiple agents can work simultaneously on different tasks

## Techniques

**Agent Specialization Patterns:**
- Brand copywriter → marketing content generation
- Security reviewer → code vulnerability analysis  
- UX/UI specialist → interface design recommendations
- Planning agent → project structure and roadmaps

**Multi-Agent Coordination:**
- Spin up multiple instances of same agent type
- Run different specialized agents in parallel
- Each maintains independent context and memory

**Agent vs Skills Decision:**
- ALWAYS use agents when: Need isolated context, specialized expertise, independent thinking
- NEVER use agents when: Need to stack multiple capabilities in same context

## Anti-Patterns

**NEVER create agents for:**
- Simple single-step tasks (use direct prompts)
- Tasks that need to reference current conversation context
- Quick utility functions (use skills instead)

**NEVER configure agents with:**
- Overly broad permissions without clear need
- Vague role descriptions (be specific about capabilities)

## Edge Cases & Error Handling

**Agent Access Issues:**
- If agent list doesn't appear: restart Claude Code session
- If agent creation fails: simplify role description, check tool permissions

**Context Management:**
- Agent responses don't automatically merge with main conversation
- Copy important agent outputs to main thread for persistence
- Agents lose context when session ends (save important configurations)

**Performance Considerations:**
- Multiple opus agents consume significant tokens
- Use haiku/sonnet for routine tasks, reserve opus for complex reasoning

## Bundled Resources Plan
- `agents/templates/` - Common agent role templates and configurations
- `agents/examples/` - Sample agent conversations and use cases
- `scripts/agent-backup.sh` - Export/import agent configurations