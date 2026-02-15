---
name: claude-code-agents-and-skills
description: Deploy specialized Claude Code agents with isolated context windows and reusable skills across instances. Trigger when building complex projects requiring specialized capabilities like marketing copy, UX design, or multi-step planning workflows that need dedicated context isolation or cross-project skill reuse.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Agents and Skills Deployment

Deploy specialized agents with isolated context windows and create reusable skills for complex project workflows.

## Quick Start
Create agent: New agent → Choose tools/model → Save. Invoke: "Use the agent [name] to [task]"
Create skill: Type "create a skill that [purpose]" or `/skills` to manage existing ones.

## Core Workflow

### Agent Creation and Deployment
WHEN building complex projects requiring specialized capabilities:
1. Create new agent with specific tools (read-only/full access)
2. Select model power level (Haiku/Sonnet/Opus) 
3. Assign color for visual identification
4. Save agent for reuse

### Agent Invocation
WHEN you need specialized expertise in existing chat:
1. Type "use the agent [agent-name]" followed by task
2. Agent works in isolated context window (different color display)
3. Agent returns results to main conversation
4. Multiple agents can work simultaneously

### Skills Creation and Management
WHEN building reusable capabilities across projects:
1. Use `/skills` to list available skills
2. Create new: "create a skill that [specific purpose using best practices]"
3. Claude creates markdown file in skills directory
4. Skills work within current context window (unlike agents)
5. Skills can be stacked together in single workflow

## Techniques

### Agent Specialization Patterns
- Marketing copy agent for landing pages/headlines
- UX/UI agent for design decisions  
- Planning agent for project architecture
- Ask Claude: "what kind of agents do you recommend I create?"

### Skill Stacking
- Combine multiple skills: "Use title generator skill and script generator skill together"
- Skills invoke separately but work in unified workflow
- Each skill maintains its specialized knowledge base

### Ultra Think Mode Enhancement
- Type "ultra think" before any prompt
- Changes to rainbow color display
- Uses more tokens for deeper reasoning
- Works with both agents and skills

## Anti-Patterns

NEVER create agents without clear specialization purpose
NEVER confuse agents (isolated context) with skills (current context)  
NEVER use ultra think mode unnecessarily (token intensive)
NEVER forget agents can work simultaneously - leverage parallelization

## Edge Cases & Error Handling

**Agent Context Isolation**: Agents don't retain conversation history from main chat
**Skill Persistence**: Skills persist across all Claude Code instances once created
**Model Selection**: Choose agent model based on task complexity (Opus for complex reasoning)
**Tool Access**: Match agent permissions to required capabilities

## Bundled Resources Plan

- `scripts/agent-templates.md` - Pre-configured agent setups for common use cases
- `skills/skill-library.md` - Curated collection of proven skill patterns
- `references/context-management.md` - Best practices for agent vs skill selection