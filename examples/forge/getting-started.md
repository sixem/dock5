---
sidebarLabel: Getting started
sidebarOrder: 1
---

# Build your first project

The commands below illustrate an imaginary CLI; there is nothing to install.

## Project layout

```text
project/
  forge.json
  src/
    main.ts
```

## Build

```sh
forge build --config forge.json
```

A successful build writes its output to `build/`. To change that directory, see [configuration](./reference/config.md).

## A repeatable build

1. Prepare the project.
   - Keep source files in `src/`.
   - Commit the configuration.
2. Run the build.
   - Inspect warnings before sharing the output.

Use the [configuration reference][config] when changing defaults.

~~Guess the output directory~~ Read the configuration first.

[config]: ./reference/config.md
