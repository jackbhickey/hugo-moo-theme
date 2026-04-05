---
title: "Typography"
description: "Fonts, type scale, and prose styling"
weight: 2
---

## Fonts

moo-theme uses three font families:

- [**Fraunces**](https://fonts.google.com/specimen/Fraunces) — headings (h1–h6). A display serif with warmth and personality.
- [**Cormorant Garamond**](https://fonts.google.com/specimen/Cormorant+Garamond) — body text, navigation, and UI. An elegant text serif.
- **Courier New** — code blocks and the `claude` shortcode.

Both web fonts are loaded from [Google Fonts](https://fonts.google.com/).

## Type scale

The type scale uses [Utopia](https://utopia.fyi/) fluid clamp values. Text scales smoothly between viewport widths of 320px and 1240px:

| Step | Min | Max | Usage |
|------|-----|-----|-------|
| `--step--2` | 0.74rem | 0.70rem | Small labels, badges |
| `--step--1` | 0.89rem | 0.94rem | Nav links, meta text |
| `--step-0` | 1.06rem | 1.25rem | Body text |
| `--step-1` | 1.28rem | 1.67rem | h4, section titles |
| `--step-2` | 1.53rem | 2.22rem | h3 |
| `--step-3` | 1.84rem | 2.96rem | h2 |
| `--step-4` | 2.20rem | 3.95rem | h1 |
| `--step-5` | 2.64rem | 5.26rem | Home page title |

## Prose elements

All content renders inside a `.prose` wrapper. Here's how standard elements look:

### Headings

Headings h2–h4 show a `#` anchor link on hover for deep linking.

### Paragraphs

Body text is left-aligned for readability (per WCAG 1.4.8). The maximum line length is 68 characters (`--measure: 68ch`).

### Lists

- Unordered lists use default bullets
- With consistent spacing

1. Ordered lists work too
2. With the same spacing

### Blockquotes

> Blockquotes get an orange left border and a muted background. They're italic by default.

### Code

Inline `code` gets a subtle background and border. Code blocks get a left accent border:

```go
func main() {
    fmt.Println("Hello from moo-theme")
}
```

### Tables

| Column A | Column B | Column C |
|----------|----------|----------|
| Cell 1 | Cell 2 | Cell 3 |
| Cell 4 | Cell 5 | Cell 6 |

### Horizontal rules

---

A simple line with generous spacing.
