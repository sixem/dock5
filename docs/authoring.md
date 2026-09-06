---
title: Authoring docs
---

# Authoring docs

## Titles

- Use YAML frontmatter: `title:` names the page; `sidebarLabel:` overrides its navigation label.
- Otherwise, the first `# H1` is used as the title.
- The first `# H1` is treated as the title and is not rendered in the page body.

## Links

- Relative links to other Markdown files are rewritten into dock5 routes.
  - Example: `[Theming](./guides/theming.md)` -> navigates to that page
- `#anchors` are treated as in-page anchors and rewritten to include the page slug.

## Safety model (current)

- A small HTML subset supports README logos, links, and alignment; other HTML is escaped.
- URLs are sanitized (dangerous protocols are removed).

## Search

Search runs locally and finds page titles and section text. Published pages hidden
from the sidebar remain searchable; drafts and excluded files are not published.
