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

Dock5 is built to be both:

- This repo's own documentation site (from `docs/`), and
- A reusable docs-to-SPA engine you can point at any Markdown folder.

By default, dev mode generates docs from `docs/` and starts Vite. It also watches
the docs folder and regenerates `src/generated/docs.json` when Markdown changes.

### Use a different docs folder

When passing args to pnpm scripts, the first `--` is required.

You can pass the docs folder as a positional argument:

```sh
pnpm dev -- ./path/to/my/docs
```

Or use an explicit flag:

```sh
pnpm dev -- --docs ./path/to/my/docs
```

To pass args through to Vite, just append them (or add a second `--` if you want
an explicit separator):

```sh
pnpm dev -- ./path/to/my/docs --open
# or
pnpm dev -- ./path/to/my/docs -- --open
```

## Build

```sh
pnpm build
pnpm preview
```

To build using a different docs folder:

```sh
pnpm build -- ./path/to/my/docs
```

The deployable static site is `dist/` (works on static hosts; hash routing means
no rewrites required).

## Generate (build-time)

Generate a docs manifest consumed by the SPA:

```sh
pnpm generate -- ./my-docs
```

Defaults:

- Input: `docs/` (when no `<docsDir>` is provided)
- Output: `src/generated/docs.json`

`src/generated/docs.json` is generated output (gitignored); don't edit it by hand.

If you previously committed it (or it contains output from testing another docs folder), untrack it once:

```sh
git rm --cached src/generated/docs.json
```

## Docs conventions (current)

- `title:` frontmatter is preferred; otherwise the first `# H1` is used as the page title.
- The first `# H1` is treated as the page title and is not rendered in the page body.
- `index.md` becomes `/` (or the folder route for nested indexes).
- If a folder has no `index.md`, `README.md` becomes the folder route instead (common repo convention).

## Assets (images, PDFs, etc.)

By default, `pnpm generate` copies non-`.md` files from the docs input folder into `public/docs-assets/`,
and rewrites relative links/images in generated HTML to `docs-assets/...` (relative), so builds work when hosted
under a sub-path like `/docs/`.

### Hosting under a sub-path (e.g. GitHub Pages)

`pnpm build` output is sub-path friendly by default (Vite build uses a relative base, and doc assets are rewritten
to a relative `docs-assets/` URL base).

If you need an absolute base (or you want assets hosted somewhere else), you can override both:

```sh
pnpm generate -- ./my-docs --assetsBase /my-repo/docs-assets
pnpm exec vite build --base=/my-repo/
```

Tip: if you serve the site at a path without a trailing slash (e.g. `/docs`), configure your host to redirect
to `/docs/` so relative asset URLs resolve consistently.
