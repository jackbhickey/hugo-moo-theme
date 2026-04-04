---
title: "Auth Visibility"
description: "Optional client-side show/hide for authenticated content"
weight: 4
---

moo-theme includes an optional auth-aware visibility system. When enabled, pages with `public: false` in their frontmatter are hidden from navigation and the home page for unauthenticated visitors. The server still enforces access control — this is purely cosmetic.

## Enabling auth

Add these params to `hugo.toml`:

```toml
[params]
  authCheckUrl = "/auth-check"               # endpoint that returns 200 (authed) or 401
  signInUrl = "/oauth2/sign_in?rd=/"         # optional, defaults to this
  signOutUrl = "/oauth2/sign_out"            # optional, defaults to this
```

Then provide a `static/js/auth.js` that checks the endpoint and sets a data attribute on `<html>`:

```javascript
(function () {
  fetch('/auth-check', { credentials: 'same-origin' })
    .then(function (res) {
      if (res.ok) {
        document.documentElement.setAttribute('data-authenticated', '');
      }
    })
    .catch(function () {});
})();
```

The theme includes this script automatically when `authCheckUrl` is set.

## Marking pages

Set `public: true` or `public: false` in frontmatter:

```yaml
---
title: "Secret Stuff"
public: false
---
```

When auth is not enabled (no `authCheckUrl`), the `public` field is ignored and everything is visible.

## How it works

1. **Templates** add `data-auth-required` to nav items and home page cards for non-public pages.
2. **JS** fetches `authCheckUrl`. If it returns 200, sets `data-authenticated` on `<html>`.
3. **CSS** hides `[data-auth-required]` by default, reveals when `[data-authenticated]` is present.

```css
[data-auth-required] { display: none; }
:root[data-authenticated] [data-auth-required] { display: unset; }
```

## Sign-in / sign-out links

When auth is enabled, the sidebar footer shows a "Sign in" link (visible when signed out) and a "Sign out" link (visible when signed in). These use `data-show-when="signed-out"` and `data-show-when="signed-in"` attributes.

## Server-side enforcement

The theme only handles visibility. You still need your reverse proxy (Caddy, nginx, etc.) to actually block access to protected pages. The typical setup is:

- Public paths served directly
- Protected paths behind oauth2-proxy or similar
- `/auth-check` endpoint that returns 200/401 based on session state
