---
name: claude-code-lifecycle-hooks
description: Configure shell command hooks with exit codes to control Claude Code agent behavior at specific lifecycle points (session start, pre/post tool use). Trigger when you need to prevent agents from modifying protected files like tests or enforce workflow constraints. Use exit code 2 for blocking errors, 0 for success.
source: Transcript File Import + https://www.youtube.com/watch?v=DEMO
generated_by: SkillJack (skilljacked.com)
---

# Claude Code Lifecycle Hooks

Shell command hooks with exit codes that fire at specific Claude Code lifecycle points to control agent behavior.

## Quick Start
Create a hook that blocks test file modifications:
```bash
# Hook script returns exit code 2 when Claude tries to modify test files
if [[ "$FILE_PATH" == *"/test/"* ]]; then
    echo "Test files are protected"
    exit 2
fi
exit 0
```

## Core Workflow

**When to trigger:** Need to prevent Claude from modifying specific files or enforce workflow constraints.

1. **Identify lifecycle point** — Choose when hook should fire:
   - Session start
   - Pre-tool use (before any tool executes)  
   - Post-tool use (after tool completes)

2. **Create hook script** — Write shell command that checks conditions

3. **Set exit codes strategically:**
   - Exit code 0: Success, proceed normally
   - Exit code 2: Blocking error, halt execution with error message
   - Any other exit code: Non-blocking warning, show in verbose mode, continue execution

4. **Configure hook** — Register script to fire at chosen lifecycle point

## Techniques

### Protection Pattern
```bash
# Protect test directories from modification
if [[ "$TARGET_PATH" == *"/test"* ]] || [[ "$TARGET_PATH" == *"test_"* ]]; then
    echo "ERROR: Test files are protected from modification"
    exit 2
fi
```

### Pre-tool Validation
ALWAYS use pre-tool hooks when you need to validate before Claude executes any action.

ALWAYS return exit code 2 when you want to completely block an action and force Claude to reconsider.

### Error Messaging
Include descriptive error messages with exit code 2 — Claude receives these and can correct its approach.

## Anti-Patterns

NEVER use exit codes inconsistently — stick to 0 (success), 2 (blocking error), other (non-blocking warning).

NEVER forget that only exit code 2 actually blocks execution — other codes just show warnings.

NEVER use hooks for logic that should be in your main application — hooks are for workflow control only.

## Edge Cases & Error Handling

**Path matching failures:** Use robust pattern matching for file paths (wildcards, regex) to catch edge cases like nested directories.

**Hook script errors:** If hook script itself fails, Claude may proceed anyway — test hooks thoroughly.

**TDD workflow protection:** When using test-driven development, Claude will attempt to modify failing tests instead of fixing code — pre-tool hooks prevent this behavior.

## Bundled Resources Plan
- `scripts/test-protection-hook.sh` — Complete hook script for protecting test files
- `scripts/hook-setup.sh` — Script to register hooks in Claude Code configuration
- `references/exit-codes.md` — Reference table of all supported exit codes and behaviors