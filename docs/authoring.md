---
title: Authoring docs
---

# Authoring docs

## Titles

- Prefer `title:` frontmatter for the sidebar label.
- Otherwise, the first `# H1` is used as the title.
- The first `# H1` is treated as the title and is not rendered in the page body.

## Links

- Relative links to other Markdown files are rewritten into dock5 routes.
  - Example: `[Theming](./guides/theming.md)` -> navigates to that page
- `#anchors` are treated as in-page anchors and rewritten to include the page slug.

## Safety model (current)

- Raw HTML is treated as text (not executed).
- URLs are sanitized (dangerous protocols are removed).
