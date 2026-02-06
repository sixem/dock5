---
title: Getting started
---

# Getting started

## Requirements

- Node `20.19+` (or Node `22.12+`)
- pnpm

## Run the dock5 dev site (this repo)

```sh
pnpm install
pnpm dev
```

Dev mode:

- Generates `src/generated/docs.json` from `docs/`
- Watches `docs/` and regenerates on Markdown changes
- Starts Vite

## Use a different docs folder

```sh
pnpm dev -- --docs ./path/to/my/docs
```

## Build and preview

```sh
pnpm build
pnpm preview
```
