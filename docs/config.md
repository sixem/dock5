---
title: Configuration
---

# Configuration

dock5 is intentionally config-light right now.

## Config file

Place an optional `dock5.config.json` in your docs folder to configure the site:

```json
{ "title": "My Project" }
```

### Options

- `title`: Site name used in the header and browser titles. Defaults to the root
  page's title, or `dock5` if there isn't one.

## Inputs

- Generator input: a folder of Markdown files (default `docs/`).
- Dev/build default input in this repo: `docs/`.

## Outputs

- Generator output: `src/generated/docs.json` (manifest consumed by the SPA).
- SPA output: a static bundle (e.g. `dist/`).

## CLI flags

- `--docs` / `--input <dir>`: choose docs directory
- `--outFile <file>`: choose output manifest path (default `src/generated/docs.json`)

## Planned (not implemented yet)

- Ordering and exclusions.
- Optional “trusted docs” mode (raw HTML) with explicit documentation.
