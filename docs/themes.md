---
title: Theming
---

# Theming

Dock5’s UI is themed with CSS variables (design tokens) so it’s easy to override without rebuilding the docs content.

## What to look at

- Theme tokens: `src/app/styles/index.css` (`:root` variables)
- Theme switching: `src/app/App.tsx`

## Approach

- Keep tokens in CSS variables.
- Keep components consuming tokens (no hardcoded colors in component styles).
