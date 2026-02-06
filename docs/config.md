---
title: Configuration
---

# Configuration

dock5 is intentionally config-light right now.

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

- A tiny config file for ordering/titles/exclusions.
- Optional “trusted docs” mode (raw HTML) with explicit documentation.
