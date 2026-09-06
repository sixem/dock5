# Configuration reference

## Minimal configuration

```json
{
  "entry": "src/main.ts",
  "output": "build/",
  "minify": false
}
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| entry | src/main.ts | Input file |
| output | build/ | Destination directory |
| minify | false | Compact generated output |

## Literal text stays literal

Inline code can contain `<script>alert("example")</script>` without becoming executable HTML.

```html
<section data-label="A & B">
  <p>This is a code example, not part of the page.</p>
</section>
```

[Getting started](/getting-started.md)
