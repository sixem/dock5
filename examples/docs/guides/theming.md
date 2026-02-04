---
title: Theming
---

# Theming

The engine is **CSS-variables-first** so themes can override tokens without a rebuild.

## Principles

- Theme tokens live in `:root` variables.
- Dark/light are just different token sets.
- Components should consume tokens (not hardcode colors).

