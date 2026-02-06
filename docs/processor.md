---
title: Markdown processor
---

# Markdown processor

Dock5 currently ships a small in-repo Markdown compiler:

- `scripts/site/markdown/compile.ts`

It supports a safe subset (MVP) and produces HTML at build-time.

## Goals

- Full GFM via a standard pipeline later (remark/rehype).
- Keep raw HTML disabled by default.
- Keep URL sanitization on by default.
