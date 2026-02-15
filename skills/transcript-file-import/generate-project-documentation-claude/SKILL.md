---
name: generate-project-documentation-claude
description: Creates comprehensive project documentation using Claude including PRD (project requirements), architecture.md (data formats/APIs), decision.md (development decisions), and feature.json (token-efficient feature specs). Trigger when starting new projects, defining scope, or establishing development context to minimize coding errors.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Generate Project Documentation with Claude

Use Claude to create structured project documentation that reduces development errors to near-zero through comprehensive context provision.

## Quick Start
Provide Claude with your project idea and request the four-document structure: PRD, architecture.md, decision.md, and feature.json.

## Core Workflow

### When to Trigger
- Starting new projects
- Unclear project requirements
- Need to establish development context
- Want to minimize coding errors

### Documentation Generation Process
1. **Prepare Context** — Gather all project information, requirements, and constraints
2. **Request Four Documents** — Ask Claude to create:
   - PRD (Project Requirements Document)
   - architecture.md (technical specifications)
   - decision.md (development decisions log)
   - feature.json (token-efficient feature specifications)
3. **Validate Coverage** — Ensure each document covers its specific aspect completely
4. **Use as Context** — Reference these documents in all subsequent Claude interactions

## Techniques

### Document Structure Requirements
- **PRD**: MUST contain project requirements and scope definition
- **architecture.md**: MUST include data formatting, file structure, APIs, and architecture details
- **decision.md**: MUST log all decisions made during creation for future reference
- **feature.json**: MUST use token-efficient JSON format with complete feature details

### Context Optimization Pattern
- ALWAYS provide comprehensive project context to Claude
- ALWAYS break down requirements into subparts
- ALWAYS include framework/library documentation when relevant

## Anti-Patterns
- NEVER skip context provision — errors increase dramatically
- NEVER create documentation manually when Claude can generate it
- NEVER omit the decision.md file — future reference is critical
- NEVER use verbose formats for feature.json — token efficiency is essential

## Edge Cases & Error Handling
- **Incomplete Requirements**: Re-prompt with specific gaps identified
- **Missing Technical Details**: Explicitly request architecture clarification
- **Feature Overlap**: Ensure feature.json entries are distinct and non-redundant

## Bundled Resources Plan
- `templates/prd-template.md` — Standard PRD structure and sections
- `templates/architecture-template.md` — Architecture documentation format
- `templates/feature-schema.json` — JSON schema for feature specifications
- `prompts/documentation-generator.md` — Complete prompt for four-document generation