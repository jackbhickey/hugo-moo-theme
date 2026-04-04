---
title: "Shortcodes"
description: "Custom shortcodes included with moo-theme"
weight: 3
---

## claude

Renders a section in monospace font, visually distinct from the surrounding prose. Originally designed for AI-authored sections in blog posts where a different voice is speaking.

### Usage

```markdown
{{</* claude */>}}
Hi. I'm Claude. I'll be handling this section.

The technical explanation goes here in a different voice.

Back to you, Jack.
{{</* /claude */>}}
```

### Result

{{< claude >}}
Hi. I'm Claude. I'll be handling this section.

The technical explanation goes here in a different voice. You can include `code`, **bold**, *italic*, and all other markdown inside the shortcode.

Back to you, Jack.
{{< /claude >}}

You can use this shortcode for any content that should feel distinct from the main narrative — AI responses, terminal output narratives, guest contributions, or anything that benefits from a visual voice shift.
