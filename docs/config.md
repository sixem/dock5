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
- `defaultTheme`: `"dark"` (Black, the default) or `"light"` (White). A visitor’s saved choice takes precedence.
- `description`: A short site description for page metadata.
- `logo`: Accepted for compatibility; not currently displayed.
- `favicon`: Browser tab icon. Defaults to Dock5's icon.
- `navigation`: Label and order overrides keyed by page or folder route.
- `exclude`: Docs-relative file or folder paths to omit, including their assets.
- `links`: Header links, each with a `label` and `href` (web URL, email URL, or `#/page`).

Image paths are relative to the docs folder, for example `"logo": "./assets/logo.svg"`.
All options are optional.

## Navigation

Pages are discovered automatically and grouped by folder. Override a group or page
without listing its children:

```json
{
  "navigation": { "/guides": { "label": "Learn", "order": 1 } },
  "exclude": ["drafts/"]
}
```

For individual pages, use frontmatter:

```yaml
---
sidebarLabel: Getting started
sidebarOrder: 1
sidebarHidden: false
draft: false
---
```

Lower order values come first; unordered entries follow alphabetically.
Config overrides take precedence. `sidebarHidden` keeps the page accessible by URL;
`draft` removes it from the build. Exclusions accept exact paths, not globs.
Missing internal pages and headings produce build warnings.

Pages with two or more headings show an outline in the right rail, or a
collapsed menu on narrow screens. Set `outline: false` in frontmatter to hide
it, or `outline: true` to show it even with one heading.
Set `pagination: false` to hide previous/next links on that page. These links follow
sidebar order and skip hidden pages. Heading permalinks remain available either way.

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

- Optional “trusted docs” mode (raw HTML) with explicit documentation.
