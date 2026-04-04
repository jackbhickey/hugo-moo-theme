---
title: "Getting Started"
description: "Install the theme and create your first page"
weight: 1
---

## Installation

Add moo-theme as a Hugo module or clone it into your themes directory:

```bash
# As a git submodule
git submodule add https://github.com/jackbhickey/hugo-moo-theme.git themes/hugo-moo-theme

# Or just clone it
git clone https://github.com/jackbhickey/hugo-moo-theme.git themes/hugo-moo-theme
```

Then set the theme in your `hugo.toml`:

```toml
theme = "hugo-moo-theme"
```

## Configuration

Minimal `hugo.toml`:

```toml
baseURL = "https://example.com/"
languageCode = "en"
title = "My Docs"
theme = "hugo-moo-theme"

[params]
  subtitle = "docs"              # shown below the logo in the sidebar
  description = "My project"     # used in meta description on home page
  repoUrl = "https://github.com/you/repo"  # optional — shown in sidebar footer

[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true              # needed for shortcodes and raw HTML in markdown
  [markup.highlight]
    noClasses = false             # use CSS classes for syntax highlighting
```

## Content structure

moo-theme expects a standard Hugo content structure:

```
content/
  _index.md           # Home page
  section-one/
    _index.md         # Section index
    page-a.md         # Page in section
    page-b.md         # Page in section
  section-two/
    _index.md
    ...
  blog/
    _index.md         # Blog listing
    my-post.md        # Blog post
```

## Frontmatter

Pages use standard Hugo frontmatter:

```yaml
---
title: "Page Title"
description: "Short description shown in section listings"
weight: 10      # sort order within section
---
```

Blog posts add `date` and `author`:

```yaml
---
title: "My Post"
date: 2026-01-15
description: "What this post is about"
author: "Jack"
---
```

## Section ordering

Sections appear in the sidebar and home page in `weight` order. Set `weight` in each section's `_index.md`.
