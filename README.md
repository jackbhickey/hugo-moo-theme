# moo-theme

A warm, book-inspired documentation theme for [Hugo](https://gohugo.io).

**[Live demo and full documentation](https://hugo-moo-theme.moo.media/)**

## Features

- Serif typography (Fraunces headings, Cormorant Garamond body) with fluid Utopia scaling
- Collapsible sidebar navigation with active page highlighting
- Blog support with date/author metadata
- Heading anchor links on hover
- Optional auth-aware visibility (hide nav items for unauthenticated visitors)
- `{{</* claude */>}}` shortcode for monospace voice-shift sections
- Responsive — sidebar collapses to header bar on mobile
- Print stylesheet

## Quick start

```bash
git submodule add https://github.com/jackbhickey/hugo-moo-theme.git themes/hugo-moo-theme
```

```toml
# hugo.toml
theme = "hugo-moo-theme"

[params]
  subtitle = "docs"

[markup.goldmark.renderer]
  unsafe = true

[markup.highlight]
  noClasses = false
```

See the [documentation site](https://hugo-moo-theme.moo.media/) for configuration, typography, shortcodes, auth visibility, and layout details.

## Contributing

CSS is linted and formatted with [Biome](https://biomejs.dev). Install it however you prefer:

- [Manual installation](https://biomejs.dev/guides/manual-installation/) (standalone binary, no npm required)
- [Getting started](https://biomejs.dev/guides/getting-started/)
- This repo includes a `flake.nix` — run `nix develop` to get Biome, Hugo, and direnv in one shell

Run the linter before submitting changes:

```bash
biome check assets/css/
```

Auto-fix formatting issues:

```bash
biome check --write assets/css/
```

## License

MIT
