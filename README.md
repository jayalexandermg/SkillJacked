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

```bash
npm install
```

## License

[MIT](LICENSE)
