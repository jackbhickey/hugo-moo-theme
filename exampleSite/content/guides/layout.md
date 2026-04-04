---
title: "Layout"
description: "Page structure, sidebar, and responsive behaviour"
weight: 5
---

## Structure

Every page uses the same base layout:

```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │  Content                        │
│          │  ┌───────────────────────────┐  │
│ Logo     │  │ Breadcrumb                │  │
│ Subtitle │  │ Page title                │  │
│          │  │                           │  │
│ Overview │  │ Content...                │  │
│ Section  │  │                           │  │
│   Page   │  │                           │  │
│   Page   │  │ Footer                    │  │
│ Section  │  └───────────────────────────┘  │
│   Page   │                                 │
│          │                                 │
│ Footer   │                                 │
└──────────┴─────────────────────────────────┘
```

- **Sidebar** (240px, sticky): Logo, subtitle, collapsible section navigation, auth links, repo link.
- **Content**: Centred surface card with max-width `68ch`. Breadcrumbs at top, footer at bottom.

## Responsive

At **780px**, the sidebar collapses into a horizontal header bar showing just the logo and auth link. Section navigation is hidden — users navigate via breadcrumbs and in-page links.

At **480px**, the surface card shadow is removed and padding is reduced for edge-to-edge reading.

At **1400px+**, the sidebar widens to 280px.

## Colour palette

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-page-bg` | `#f5f0e8` | Page background |
| `--color-surface` | `#faf7f2` | Content card |
| `--color-surface-alt` | `#ede8df` | Blockquotes, service cards |
| `--color-text` | `#2c2416` | Body text |
| `--color-text-muted` | `#6b5d4f` | Secondary text |
| `--color-text-faint` | `#7a6b5c` | Breadcrumbs, meta |
| `--color-accent` | `#7a3d1f` | Headings, active states |
| `--color-link` | `#4a2c6e` | Links |
| `--color-sidebar-bg` | `#e8e0d0` | Sidebar background |

Override any variable in your own CSS to customise the palette.

## Print

The print stylesheet hides the sidebar and breadcrumbs, removes the surface card shadow, and appends URLs after links.
