---
description: Publish skilljacked CLI to npm
argument-hint: [patch|minor|major]
---

# Publish to npm

Publish the `skilljacked` CLI package to npm. Runs the full build-verify-publish pipeline.

## Variables

BUMP_TYPE: $ARGUMENTS (default: patch)

## Steps

Execute these sequentially. Stop on any failure.

1. **Bump version** (skip if no BUMP_TYPE or user says "skip bump"):
   ```bash
   cd packages/cli && npm version ${BUMP_TYPE:-patch} --no-git-tag-version
   ```
   Show the new version number.

2. **Rebuild all packages**:
   ```bash
   pnpm -r build
   ```

3. **Dry-run pack** — verify tarball contents look correct:
   ```bash
   cd packages/cli && npm pack --dry-run
   ```
   Confirm: bin file included, no src/ leaked, no .env.

4. **Smoke test** the built CLI:
   ```bash
   node packages/cli/dist/index.mjs --help
   node packages/cli/dist/index.mjs -V
   ```

5. **Publish**:
   ```bash
   cd packages/cli && npm publish --access public
   ```
   If this fails with EOTP, ask the user for an npm automation token and retry with:
   ```bash
   npm publish --access public --//registry.npmjs.org/:_authToken=TOKEN
   ```

6. **Post-publish verify**:
   ```bash
   npx skilljacked@latest --help
   ```

7. **Commit + push** the version bump:
   ```bash
   git add packages/cli/package.json
   git commit -m "release: skilljacked v$(node -p \"require('./packages/cli/package.json').version\")"
   git push
   ```

8. Report the published version and npm URL: https://www.npmjs.com/package/skilljacked
