---
name: mcp-cli-mode-optimization
description: Enable experimental MCP CLI mode in Claude Code to prevent context window bloat from multiple MCP tools in large-scale projects. Trigger when working with many MCPs or experiencing context window limitations. Loads MCP tools on-demand rather than keeping all schemas in memory.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# MCP CLI Mode Context Window Optimization

Enable on-demand MCP tool loading to prevent context window bloat in large projects.

## Quick Start
Set `experimental_MCPLI: true` in your Claude Code configuration to activate CLI mode for MCP tools.

## Core Workflow

**Trigger:** When working with multiple MCPs or experiencing context window bloat

1. **Identify Context Bloat**
   - Multiple MCP tools showing in context window
   - Working on large-scale projects with many connected MCPs
   - Context window feels cluttered with tool schemas

2. **Enable MCP CLI Mode**
   - Set the experimental MCP CLI flag to `true`
   - Verify all previously visible MCPs disappear from context
   - Confirm context window space is freed

3. **Verify On-Demand Loading**
   - MCP tools no longer persist in context window
   - Tools load only when explicitly accessed
   - Context remains clean between tool uses

## Techniques

**Configuration Pattern:**
```
experimental_MCPLI: true
```

**Before vs After:**
- Before: All MCP tool schemas loaded in context window constantly
- After: Clean context with tools loaded on-demand only

## Anti-Patterns

**NEVER:**
- Keep experimental flag disabled when working with multiple MCPs
- Ignore context window bloat in large projects
- Load all MCP schemas simultaneously in memory

## Edge Cases & Error Handling

**Tool Access Concerns:**
- Understand how to access MCP tools after enabling CLI mode
- Verify tool functionality remains intact with on-demand loading
- Test critical MCP workflows after enabling the flag

**Project Scale Considerations:**
- Monitor context window usage before and after enabling
- Ensure all required MCPs are properly configured for CLI mode
- Validate tool performance with on-demand loading