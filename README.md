# Dock5

A modern, beautiful Markdown documentation engine.

## Requirements

- Node 20.19+ (or Node 22.12+)
- pnpm

## Quick start

```sh
pnpm install
pnpm dev
```

By default, dev mode generates docs from `docs/` and starts Vite.
It also watches the docs folder and regenerates `src/generated/docs.json` when Markdown changes.

### Use a different docs folder

When passing args to pnpm scripts, use the `--` separator:

```sh
pnpm dev -- --docs ./path/to/my/docs
```

## Build

```sh
pnpm build
pnpm preview
```

## Generate (build-time)

Generate a docs manifest consumed by the SPA:

```sh
pnpm generate -- ./my-docs
```

Defaults:

- Input: `docs/` (when no `<docsDir>` is provided)
- Output: `src/generated/docs.json`

## Docs conventions (current)

- `title:` frontmatter is preferred; otherwise the first `# H1` is used as the page title.
- The first `# H1` is treated as the page title and is not rendered in the page body.
- `index.md` becomes `/` (or the folder route for nested indexes).

## Assets (images, PDFs, etc.)

By default, `pnpm generate` copies non-`.md` files from the docs input folder into `public/docs-assets/`,
and rewrites relative links/images in generated HTML to `/docs-assets/...` so they work in dev/build.
