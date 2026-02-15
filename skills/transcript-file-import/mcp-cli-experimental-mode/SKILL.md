---
name: mcp-cli-experimental-mode
description: Activates Claude Code's experimental MCP CLI mode to reduce context window bloat by loading MCP tools on-demand instead of keeping all schemas in memory. Trigger when working with multiple MCPs on large-scale projects or experiencing performance issues from context window bloat.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# MCP CLI Experimental Mode

Enable on-demand MCP tool loading to prevent context window bloat in large projects.

## Quick Start
Activate experimental MCP CLI mode in Claude Code when multiple MCPs are causing performance issues.

## Core Workflow

**Trigger:** When context window becomes bloated due to multiple connected MCPs on large-scale projects.

1. **Identify Context Bloat**
   - Multiple MCPs connected to project
   - All MCP tool schemas living in context window
   - Performance degradation observed

2. **Enable Experimental Mode**
   - Access Claude Code MCP CLI mode settings
   - Switch from persistent to on-demand loading
   - Configure CLI-based tool activation

3. **Verify On-Demand Loading**
   - Confirm MCP tools load only when needed
   - Monitor reduced baseline context usage
   - Test tool availability through CLI commands

## Techniques

**Context Window Management:**
- ALWAYS use CLI mode when working with 3+ MCPs simultaneously
- Load MCP schemas only when specific tools are invoked
- Keep baseline context clean of unused tool definitions

**Performance Optimization:**
- Monitor context window usage before/after enabling CLI mode
- Prioritize frequently-used MCPs for faster CLI access
- Document CLI commands for team consistency

## Anti-Patterns

**NEVER** keep all MCP schemas loaded in memory on large projects - this creates unnecessary context bloat.

**NEVER** ignore context window performance when scaling MCP usage - address proactively with CLI mode.

## Edge Cases & Error Handling

**MCP Tool Availability:**
- Verify CLI commands properly invoke required MCP tools
- Handle cases where on-demand loading fails
- Maintain fallback to standard mode if CLI mode causes issues

**Project Scale Transitions:**
- Switch to CLI mode before context becomes critically bloated
- Test tool functionality after enabling experimental features