---
title: "An Example Blog Post"
date: 2026-04-04
description: "This is what a blog post looks like in Tome. It has a date, an author, and all the usual prose elements."
author: "Jack"
---

This is an example blog post. Blog posts in Tome get a date and author displayed below the title, and are sorted reverse-chronologically in the blog listing and on the home page.

## Writing a post

Create a markdown file in `content/blog/` with `date` and `author` in the frontmatter:

```yaml
---
title: "My Post"
date: 2026-04-04
description: "Short description for listings"
author: "Jack"
---
```

The description appears in the blog listing and the home page "Recent Posts" section.

## Using the claude shortcode

Sometimes you want a section of your post to feel like a different voice — maybe an AI assistant explaining something technical, or a guest contributor chiming in.

{{< claude >}}
Hi. I'm the different voice. Notice how this section uses a monospace font to visually distinguish it from the surrounding prose.

You can put any markdown in here — `code`, **bold**, lists, whatever. It all renders normally, just in a different typeface.

Back to you.
{{< /claude >}}

And now we're back to the regular voice. The transition is clear without needing any explicit dividers.

## Everything else

All standard prose elements work in blog posts — headings, lists, tables, blockquotes, code blocks, images. See the [Typography](/guides/typography/) guide for the full reference.
