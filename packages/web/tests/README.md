The optional heading browser check renders the actual `JackResults`, `LibraryDetail`, and `SkillPreview` components with local fixtures. It verifies computed heading styles, frontmatter, literal source lines, fenced-code exclusions, gated placeholders, the real Clipboard API, and the `SKILL.md` bytes in real browser downloads. It blocks unexpected requests and replaces only the Clerk sign-up wrapper with an inert fixture boundary. No application server, credentials, generation, or database writes are needed.

After `pnpm install`, provide an available Playwright Core module and Chromium executable (or use locally installed Playwright with its default browser):

```sh
PLAYWRIGHT_MODULE=/path/to/playwright-core \
CHROMIUM_PATH=/path/to/chromium \
ARTIFACT_DIR=/tmp/skilljacked-heading-review \
node packages/web/tests/heading-surfaces.mjs
```

The runner uses the existing `tsx` dependency's esbuild and the web app's Tailwind CLI. Playwright is optional and is not added to the application dependencies. Add `BASELINE_REF=<commit-before-fix>` to compare the original white heading implementation and save before/after screenshots. Screenshots use local system font fallbacks so no Google Fonts request is needed. The JSON results and screenshots go to `ARTIFACT_DIR`; temporary bundles are removed after the run.
