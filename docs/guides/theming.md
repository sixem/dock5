---
title: Theming
---

# Theming

## Change the look

- Edit CSS variables in `src/app/styles/index.css`.
- Keep the theme tokens as the “public API” for custom themes.

## Light/dark

The app toggles `data-theme="light"` on the `<html>` element. Use that selector to override tokens per theme.
