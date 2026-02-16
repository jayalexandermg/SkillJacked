# SkillJacked

Extract, transform, and format skills from any source into structured, portable knowledge.

## Architecture

Monorepo with three packages:

- **`packages/core`** — Extraction, transformation, and formatting pipeline
- **`packages/cli`** — Command-line interface for running jacks
- **`packages/web`** — Next.js dashboard with auth and API

## Project Structure

```
packages/
  core/src/
    extractor/     # Pull raw skill data from sources
    transformer/   # Normalize and enrich extracted data
    formatter/     # Output to structured formats
    utils/
  cli/src/
    commands/      # CLI command handlers
    utils/
  web/src/
    app/
      api/auth/    # Authentication endpoints
      api/jack/    # Jack execution endpoints
      dashboard/   # Dashboard UI
    components/
    lib/
    styles/
```

## Getting Started
## Quickstart (CLI)

### 1) Install deps
```bash
npm install
2) Set your API key
# mac/linux
export ANTHROPIC_API_KEY="YOUR_KEY"

# windows (powershell)
$env:ANTHROPIC_API_KEY="YOUR_KEY"
3) Run (from YouTube URL)
# Example
npx skilljacked ingest "https://www.youtube.com/watch?v=abc123"
Outputs will be written to:

skills/<video-slug>/INDEX.md

skills/<video-slug>/<skill-slug>/SKILL.md

Generate all topics (multi-skill)
npx skilljacked ingest "https://www.youtube.com/watch?v=abc123" --multi --max 12
Fallback mode (no scraping) — demo / reliability
If transcript scraping fails (captions disabled, rate limit, etc.), provide a local transcript file:

npx skilljacked ingest "https://www.youtube.com/watch?v=abc123" --transcript-file ./demo-transcript.txt

And add one tiny “Troubleshooting” section:

```md
## Troubleshooting

- If scraping fails, try `--transcript-file`.
- Some videos have captions disabled; scraping may not be possible.
- Ensure `ANTHROPIC_API_KEY` is set in your environment.

### API Key Setup

One-time setup — saves your key locally so you don't need to export it every session:

```bash
skilljack config set-key sk-ant-...
```

The `ANTHROPIC_API_KEY` environment variable still works and takes priority over the saved key.

## License

[MIT](LICENSE)
