---
title: Markdown processor
---

# Markdown processor

Dock5 uses markdown-it for Markdown, YAML for frontmatter, and Highlight.js for
fenced code blocks. Parsing and highlighting happen at build time.

Nested lists, reference links, tables, and strikethrough are supported. Escape
pipes inside table cells as `\|`, including inside inline code.

Relative document and asset links keep working. Unknown code languages render as
plain text. A small HTML subset supports README logos, links, and alignment;
other HTML is escaped and dangerous URL protocols are removed.
