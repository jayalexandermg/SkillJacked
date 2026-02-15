---
name: claude-plan-mode-development
description: Enable Claude's plan mode (shift+tab) to structure app development with clarifying questions and detailed planning before code generation. Triggers on: "build app", "create application", "develop system", or before any complex coding project. Ensures requirements gathering and architectural planning upfront.
source: 10 Claude Code tips I wish I knew from the start + https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP
generated_by: SkillJack (skilljacked.com)
---

# Claude Plan Mode for App Development

Use shift+tab to activate plan mode for structured development with upfront requirements gathering.

## Quick Start
Press shift+tab when asking Claude to build any application. Claude will ask clarifying questions before writing code.

## Core Workflow

### When to Trigger Plan Mode
- ALWAYS use shift+tab before requesting: "build app", "create application", "develop system"
- ALWAYS use for multi-file projects
- ALWAYS use when requirements are incomplete or vague

### Plan Mode Process
1. **Activate**: Press shift+tab before submitting your request
2. **Respond**: Answer Claude's clarifying questions thoroughly
3. **Review**: Examine the detailed plan Claude provides
4. **Iterate**: Request plan modifications if needed
5. **Execute**: Approve plan to begin code generation

## Techniques

### Effective Plan Mode Requests
- State your goal clearly: "Build a task management app"
- Include any constraints: "Using React and Node.js"
- Mention target users: "For small teams"
- Specify deployment needs: "Deploy to Vercel"

### Plan Review Checklist
- Architecture decisions explained
- Technology stack justified
- File structure outlined
- Key features prioritized
- Implementation order logical

## Anti-Patterns

- NEVER skip plan mode for complex applications
- NEVER accept plans without reviewing architecture decisions
- NEVER proceed if clarifying questions reveal scope creep
- NEVER ignore suggested alternatives in the plan

## Edge Cases & Error Handling

### When Plan Mode Doesn't Trigger
- Ensure shift+tab is pressed before submit
- Rephrase request to be more specific about building/creating
- Add "Please plan this first" to your prompt

### Incomplete Plans
- Ask for specific missing sections: "Add database schema to plan"
- Request implementation timeline: "Break plan into development phases"
- Clarify dependencies: "What external APIs are needed?"

### Over-Engineering in Plans
- Challenge complex solutions: "Is there a simpler approach?"
- Set explicit constraints: "Keep it minimal for MVP"
- Request alternatives: "Show me a lighter-weight option"