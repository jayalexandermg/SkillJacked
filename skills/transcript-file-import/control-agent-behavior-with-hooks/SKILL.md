---
name: control-agent-behavior-with-hooks
description: Control agent behavior using shell command hooks with exit codes. Trigger: when you need to prevent agents from modifying protected files (like test scripts), or control when agents proceed/block during development workflows. Set up hooks that fire at specific lifecycle points with exit code 0 (proceed), 2 (block), or other (ignore).
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Control Agent Behavior with Custom Hooks and Exit Codes

Control when Claude Code agents can proceed, block, or ignore actions using shell command hooks with specific exit codes.

## Quick Start
Set up a hook that returns exit code 2 to block Claude from modifying test files:
```bash
# Hook script that prevents test file modifications
if [[ "$FILE_PATH" == *"test"* ]]; then
  exit 2  # Block action
fi
exit 0  # Allow action
```

## Core Workflow

**When to trigger:** Need to control agent behavior during development workflows, especially protecting critical files.

1. **Identify control points** - Determine lifecycle moments where you need intervention (session start, before/after tool use)
2. **Write hook scripts** - Create shell commands that evaluate the current action
3. **Set exit codes strategically:**
   - Exit code 0: Success, proceed with action
   - Exit code 2: Blocking error, stop and force correction
   - Any other exit code: Non-blocking warning, continue execution
4. **Configure hooks** - Register hooks to fire at specific lifecycle points

## Techniques

### Exit Code Strategy
- **ALWAYS use exit code 2** when you want to completely block an action and force the agent to correct itself
- **ALWAYS use exit code 0** when the action should proceed normally  
- **Use other exit codes** for warnings that shouldn't stop execution (shown in verbose mode only)

### Test Protection Pattern
```bash
# Prevent test file modification
if [[ "$ACTION" == "modify" && "$FILE_PATH" =~ test ]]; then
  echo "Error: Cannot modify test files"
  exit 2
fi
```

### Hook Types Available
- Session start hooks
- Before tool use hooks  
- After tool use hooks
- File modification hooks

## Anti-Patterns

**NEVER use exit code 2 for warnings** - This blocks execution when you only want to notify.

**NEVER set up hooks without testing** - Verify your exit code logic works before deploying.

**NEVER ignore the agent's error response** - When exit code 2 triggers, the agent gets an error message and should correct itself.

## Edge Cases & Error Handling

- Hook scripts must be executable and return quickly to avoid timeouts
- Test hook logic with various file paths and actions before deployment
- Monitor verbose output for non-blocking warnings (non-0, non-2 exit codes)
- Ensure error messages from exit code 2 are clear enough for agent self-correction

## Bundled Resources Plan

- `scripts/test-protection-hook.sh` - Template hook script for protecting test files
- `scripts/file-pattern-blocker.sh` - Generic hook for blocking files matching patterns
- `references/hook-lifecycle-points.md` - Complete list of available hook trigger points