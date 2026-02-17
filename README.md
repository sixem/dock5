# Dock5

Dock5 turns a folder of Markdown files into a modern documentation site.
It is designed to be easy to run, easy to host, and pleasant to read.

## Highlights

- Works great on static hosting (including GitHub Pages)
- Generates navigation from your docs folder
- Fast SPA-style navigation
- Themeable UI
- No backend required

## Requirements

- Node `20.19+` or `22.12+`
- `pnpm`

## Quick Start

```sh
pnpm install
pnpm dev
```

This runs Dock5 using the default `docs/` folder.

## Use a Different Docs Folder

```sh
pnpm dev -- ./path/to/my-docs
# or
pnpm dev -- --docs ./path/to/my-docs
```

## Build

```sh
pnpm build
pnpm preview
```

Build with a custom docs folder:

```sh
pnpm build -- ./path/to/my-docs
```

Production output goes to `dist/`.

## Generate Docs Data Only

```sh
pnpm generate -- ./my-docs
```

## Common Commands

- `pnpm dev` - Start local development
- `pnpm build` - Build for production
- `pnpm preview` - Preview the production build
- `pnpm generate` - Generate docs data
- `pnpm test` - Run tests
- `pnpm lint` - Run lint checks
- `pnpm format` - Format code
- `pnpm typecheck` - Run TypeScript checks

## Markdown Behavior

- `title:` in frontmatter is preferred for page titles
- Otherwise, the first `#` heading is used
- `index.md` becomes the folder page
- If no `index.md` exists, `README.md` is used as the folder page

## Contributing

Contributions are welcome. Keep changes focused and include docs/tests when behavior changes.
