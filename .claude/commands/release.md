---
description: Full release — build, test, commit, publish
argument-hint: [patch|minor|major]
---

# Release

Complete release workflow: build, verify, commit all changes, publish to npm.

## Variables

BUMP_TYPE: $ARGUMENTS (default: patch)

## Steps

Execute these sequentially. Stop on any failure.

1. **Check for uncommitted changes**:
   ```bash
   git status --short
   ```
   If there are changes, commit them first with a descriptive message before proceeding.

2. **Bump version**:
   ```bash
   cd packages/cli && npm version ${BUMP_TYPE:-patch} --no-git-tag-version
   ```

3. **Rebuild all packages**:
   ```bash
   pnpm -r build
   ```

4. **Smoke test**:
   ```bash
   node packages/cli/dist/index.mjs --help
   node packages/cli/dist/index.mjs -V
   ```

5. **Commit version bump**:
   ```bash
   git add packages/cli/package.json
   git commit -m "release: skilljacked v$(node -p \"require('./packages/cli/package.json').version\")"
   git push
   ```

6. **Publish to npm**:
   ```bash
   cd packages/cli && npm publish --access public
   ```
   If EOTP error: ask user for npm automation token, retry with `--//registry.npmjs.org/:_authToken=TOKEN`.

7. **Post-publish verify**:
   ```bash
   npx skilljacked@latest --help
   ```

8. Report: version, npm URL, git commit hash.
