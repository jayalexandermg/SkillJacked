---
name: adversarial-agent-qa-pairs
description: Sets up paired AI agents where one performs development tasks while another acts as quality assurance through user story validation. Triggers when implementing features, testing systems, or validating against user expectations. Uses predefined user stories as acceptance criteria to catch implementation gaps and edge cases systematically.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Adversarial Agent QA Pairs

Deploy two AI agents in opposing roles: one implements, one validates against user stories for systematic quality assurance.

## Quick Start
1. Agent 1: Generate comprehensive user stories before implementation
2. Agent 2: Test implementation against each story's acceptance criteria
3. Iterate until all stories pass validation

## Core Workflow

**When starting any development project:**
1. **Pre-Implementation Phase**
   - Agent 1 writes user stories covering all interaction scenarios
   - Include priority levels and acceptance criteria for each story
   - Cover best case AND edge case scenarios
   - Document stories in structured folder system

2. **Implementation Phase**
   - Agent 1 implements features following user story requirements
   - Start with optimal path from each story
   - Ensure edge cases are addressed during build

3. **Validation Phase**  
   - Agent 2 tests implementation against each user story
   - Verify acceptance criteria are met
   - Flag gaps between expected and actual behavior
   - Report implementation deficiencies

## Techniques

**User Story Structure:**
- Specific aspect of the system being tested
- Priority level (high/medium/low)
- Acceptance criteria (measurable pass/fail conditions)
- Edge case scenarios included

**Agent Role Definition:**
- **Builder Agent**: Implements according to user stories, starts with optimal paths
- **Validator Agent**: Tests against acceptance criteria, identifies gaps

**Story-Driven Implementation:**
- Implement stories one by one in priority order
- Use acceptance criteria as implementation checkpoints
- Address edge cases during initial build, not as afterthought

## Anti-Patterns

**NEVER implement without user stories** - leads to gaps between user expectations and actual functionality

**NEVER skip edge case documentation** in user stories - validator agent needs complete criteria

**NEVER have same agent build and validate** - removes adversarial quality check

## Edge Cases & Error Handling

**Incomplete User Stories**: Validator agent should flag when acceptance criteria are too vague or missing edge cases

**Priority Conflicts**: When stories conflict, higher priority story takes precedence in implementation decisions

**Validation Failures**: Builder agent must address specific gaps identified by validator before proceeding to next story

## Bundled Resources Plan
- `user-stories/`: Complete user story templates with priority and acceptance criteria examples
- `validation-prompts/`: Specific prompts for validator agent to systematically test against stories
- `implementation-checklist/`: Step-by-step verification process for builder agent