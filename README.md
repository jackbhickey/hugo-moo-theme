# moo-theme

A warm, book-inspired documentation theme for [Hugo](https://gohugo.io).

**[Live demo and full documentation](https://hugo-moo-theme.moo.media/)**

## Features

- Serif typography (Fraunces headings, Cormorant Garamond body) with fluid Utopia scaling
- Collapsible sidebar navigation with active page highlighting
- Blog support with date/author metadata
- Heading anchor links on hover
- Optional auth-aware visibility — auth-gated nav and home cards are *trimmed out of the build* for anonymous visitors (their titles and URLs are never sent, not just CSS-hidden), then restored for authenticated users via a small [htmx](https://htmx.org) fetch
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

## Tooling & dependencies — no npm

This is a static Hugo theme: HTML templates, CSS (linted with Biome), and exactly **one** vendored JavaScript library — [htmx](https://htmx.org), used only for the auth-visibility upgrade. None of that needs a Node.js toolchain, so the theme deliberately has none: no `package.json`, no `node_modules`, no lockfile.

Pulling htmx from npm would force *every* user and contributor to install Node and a package manager, drag in a transitive dependency tree, and inherit npm's supply-chain risk (typosquatted packages, compromised transitive deps, arbitrary `postinstall` scripts) — all to obtain a single ~50 KB file. That's a poor trade. Instead, `flake.nix` fetches htmx by pinned URL + SHA-256 hash and `nix run .#vendor` writes it to `assets/js/vendor/htmx.min.js`, which is committed and served with a Subresource Integrity hash. One file, one pin, verifiable from upstream to browser.

Nix pins the rest of the toolchain too (`nix develop` → Hugo + Biome + direnv), so it covers everything the project actually needs — and Node never enters the picture. The responsibilities split cleanly:

- **Users** need nothing extra: `git submodule add`, run `hugo`. The vendored htmx is already committed, so the build touches neither nix nor npm.
- **Contributors** get a reproducible shell with `nix develop` (optional, but it's the pinned Hugo + Biome).
- **Maintainers** bump htmx by editing the version in `flake.nix` and running `nix run .#vendor` (paste the hash nix prints on mismatch).

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
