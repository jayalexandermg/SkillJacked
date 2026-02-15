---
name: ai-agent-project-context-documentation
description: Creates comprehensive project documentation (PRD, architecture.md, decision.md, feature.json) to provide AI agents with proper context. Deploy when starting new projects or when AI agents produce errors due to insufficient context. Triggers: "new project setup", "agent context errors", "project documentation needed".
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# AI Agent Project Context Documentation

Generate comprehensive project documentation to eliminate AI agent errors through proper context provision.

## Quick Start
When starting a new project, immediately create four core documents: PRD, architecture.md, decision.md, and feature.json using a single Claude prompt containing all project information.

## Core Workflow

**Trigger**: Starting new project OR AI agents producing context-related errors

1. **Gather Complete Project Information**
   - Collect all project requirements, scope, and technical details
   - Identify frameworks and libraries to be used
   - Document project constraints and goals

2. **Create Master Prompt**
   - Structure all collected information into comprehensive prompt
   - Include specific instruction to generate four distinct documents
   - Request token-efficient formatting for feature documentation

3. **Generate Four Core Documents**:
   - **PRD**: Project requirements and scope
   - **architecture.md**: Data formatting, file structure, APIs, architecture details
   - **decision.md**: All architectural and implementation decisions for future reference
   - **feature.json**: All features in JSON format with completion criteria and tracking

4. **Validate Documentation Set**
   - Ensure PRD covers complete project scope
   - Verify architecture.md includes all technical specifications
   - Confirm decision.md captures rationale for future agents
   - Test feature.json format for token efficiency

## Techniques

**Feature.json Structure**:
- Use token-efficient JSON format
- Include completion criteria for each feature
- Add "passes" key for implementation tracking
- Structure: feature details + completion criteria + status tracking

**Context Optimization**:
- Break large projects into documented subparts
- Document framework/library specifics agents will encounter
- Create decision log for consistent future agent behavior

## Anti-Patterns

**NEVER** skip documentation creation when starting projects - context errors compound exponentially.

**NEVER** create incomplete PRDs - agents need full scope understanding to avoid scope creep.

**NEVER** omit decision documentation - future agents will remake the same decisions inconsistently.

**NEVER** use verbose feature documentation - token efficiency is critical for agent processing.

## Edge Cases & Error Handling

**Complex Multi-Module Projects**: Break PRD into module-specific sections while maintaining overall coherence.

**Evolving Requirements**: Update all four documents simultaneously to maintain context consistency.

**Legacy Project Documentation**: Generate documentation retroactively by analyzing existing codebase with Claude before making changes.

## Bundled Resources Plan

- `templates/prd-template.md` - Standard PRD structure and required sections
- `templates/architecture-template.md` - Architecture documentation format
- `templates/feature-schema.json` - JSON schema for feature documentation
- `prompts/documentation-generator.txt` - Master prompt for generating all four documents