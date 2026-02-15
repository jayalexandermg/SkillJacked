---
name: ai-context-optimization
description: Systematically provides optimal context to AI agents through structured project requirements, framework documentation, and targeted prompts. Eliminates near-zero errors in development tasks by ensuring agents know exactly what to act upon. Trigger when starting new AI-assisted development work or experiencing frequent AI errors.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# AI Context Optimization

Reduce AI development errors to near-zero through strategic context provision.

## Quick Start
Before asking AI to implement anything, provide: project requirements breakdown + framework documentation + specific constraints in structured format.

## Core Workflow

### When Starting AI-Assisted Development
1. **Break Down Requirements** — Decompose project into subparts with clear boundaries
2. **Document Frameworks** — Include version numbers, key concepts, and usage patterns for all libraries
3. **Structure Information** — Present context in logical hierarchy (requirements → constraints → technical details)
4. **Validate Context Completeness** — Ensure AI has everything needed to act without assumptions

### When Experiencing AI Errors
1. **Identify Missing Context** — What information would eliminate the uncertainty?
2. **Add Framework-Specific Details** — Include API patterns, conventions, and limitations
3. **Clarify Requirements** — Make implicit expectations explicit
4. **Re-prompt with Enhanced Context** — Combine original request with missing information

## Techniques

### Project Requirements Structure
- ALWAYS break large requirements into subparts with clear interfaces
- NEVER assume AI understands project scope without explicit boundaries
- Document expected inputs/outputs for each component

### Framework Documentation Pattern
- Include library versions and breaking changes
- Document preferred patterns and anti-patterns for the specific framework
- Provide relevant code examples from your existing codebase

### Context Layering Strategy
- Start with high-level project goals
- Add technical constraints and environment details  
- Include framework-specific conventions last

## Anti-Patterns

- NEVER assume AI remembers previous conversation context across sessions
- NEVER provide requirements without technical constraints
- NEVER skip framework version information — different versions have different capabilities
- NEVER give partial context and expect AI to infer the rest

## Edge Cases & Error Handling

### Conflicting Framework Versions
- Always specify exact versions when multiple frameworks interact
- Document known compatibility issues upfront

### Large Context Limits
- Prioritize requirements documentation over implementation examples
- Use external documentation references when context exceeds limits

### Incomplete Requirements
- ALWAYS flag uncertain requirements as "needs clarification" rather than letting AI guess

## Bundled Resources Plan

- `templates/context-checklist.md` — Pre-flight context validation checklist
- `templates/requirements-breakdown.md` — Standard format for project decomposition
- `templates/framework-docs-template.md` — Documentation structure for library context