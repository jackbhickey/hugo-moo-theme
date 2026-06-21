---
title: "Auth Visibility"
description: "Build-time nav trimming + htmx upgrade for authenticated content"
weight: 4
---

moo-theme includes an optional auth-aware visibility system. When enabled, pages with `public: false` in their frontmatter are **trimmed out of the build output** that unauthenticated visitors receive — their titles and URLs never appear in the public HTML, sitemap, or RSS feed. This is **not** a cosmetic CSS hide: the protected metadata is genuinely withheld, and the reverse proxy enforces access to the pages themselves.

Authenticated visitors get the full navigation back via a tiny [htmx](https://htmx.org/) fetch, so the experience is seamless once they're signed in.

## Enabling auth

Add these params to `hugo.toml`:

```toml
[params]
  authCheckUrl = "/auth-check"               # endpoint that returns 200 (authed) or 401
  signInUrl = "/oauth2/sign_in?rd=/"         # optional, defaults to this
  signOutUrl = "/oauth2/sign_out"            # optional, defaults to this
```

When `authCheckUrl` is set, the theme automatically:

- loads its vendored copy of **htmx** (pinned + fetched reproducibly via the theme's `flake.nix`, served with a Subresource Integrity hash), and
- includes a small `auth.js` you provide at `static/js/auth.js`, which toggles the sign-in / sign-out links:

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

## The nav fragment (`/_nav.html`)

Trimmed public pages ship the public-only sidebar plus an htmx hook that fetches the **full** nav from `/_nav.html` once the visitor is known to be authenticated. Publish that fragment with a one-page content stub using the theme's `nav-fragment` layout:

```yaml
---
# content/nav.md  → published at /_nav.html
title: "nav"
url: "/_nav.html"
layout: "nav-fragment"
public: false
sitemap:
  disable: true
build:
  list: never
  render: always
  publishResources: false
---
```

The `nav-fragment` layout renders **only** a `<nav class="sidebar-nav">` (no `<head>`/`<body>`), with every section included and **no** `hx-*` attributes, so the swapped-in nav doesn't re-fetch itself. It must be served behind auth and return **401 to anonymous requests** (see below).

## Marking pages

Set `public: true` or `public: false` in frontmatter:

```yaml
---
title: "Secret Stuff"
public: false
---
```

When auth is not enabled (no `authCheckUrl`), the `public` field is ignored and everything is visible, listed, and fed — the trimming only kicks in once there's a proxy actually gating access.

> **Keep `public: false` consistent with what your proxy gates.** A page's own `public` flag decides which nav it's built with: a `public: false` page is built with the *full* nav, on the assumption the proxy only ever serves it to authenticated users. If you mark a page `public: false` but leave it publicly reachable, that page will hand the full nav to anonymous visitors. Gate it, or mark it `public: true`.

## How it works

1. **Build time.** A public page is built with only public nav entries and home-page cards. A `public: false` page is built with the full nav — safe, because the proxy only delivers it to authenticated users.
2. **Upgrade fetch.** The trimmed nav carries `hx-get="/_nav.html" hx-trigger="load" hx-target="this" hx-swap="outerHTML"`. On load, htmx fetches the fragment. An authenticated request gets **200** and the full nav is swapped in; an anonymous request gets **401**, which htmx treats as an error and leaves the trimmed nav untouched.
3. **Feeds.** `sitemap.xml` and the RSS templates filter out `public: false` pages, so neither enumerates protected URLs or leaks their summaries.
4. **Links.** `auth.js` sets `data-authenticated` on `<html>`, which CSS uses only to toggle the sign-in / sign-out links.

```css
[data-show-when="signed-in"] { display: none; }
:root[data-authenticated] [data-show-when="signed-in"] { display: unset; }
:root[data-authenticated] [data-show-when="signed-out"] { display: none; }
```

## Sign-in / sign-out links

When auth is enabled, the sidebar footer shows a "Sign in" link (visible when signed out) and a "Sign out" link (visible when signed in), via `data-show-when="signed-out"` / `data-show-when="signed-in"`.

## Server-side enforcement

The theme trims the build and wires the upgrade fetch; your reverse proxy still enforces access and provides two endpoints. Below are complete examples for Caddy and nginx, both using [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) as the auth layer.

### The two auth endpoints

Both must forward to oauth2-proxy's `/oauth2/auth` and, on failure, return a **clean 401 — no redirect, no HTML**:

- **`/auth-check`** — the JS reads this to set the sign-in/out link state.
- **`/_nav.html`** — htmx fetches this to upgrade the nav. If it redirects to a sign-in page instead of returning 401, htmx will follow the redirect and swap the **login page** into your sidebar. Returning 401 is essential.

### Caddy example

```caddy
docs.example.com {
    root * /var/www/docs

    # oauth2-proxy sign-in, callback, sign-out
    handle /oauth2/* {
        reverse_proxy oauth2-proxy:4180
    }

    # Auth check — returns 200 or 401, no redirects
    handle /auth-check {
        forward_auth oauth2-proxy:4180 {
            uri /oauth2/auth
            @unauthorized status 401
            handle_response @unauthorized {
                respond 401
            }
        }
        respond 200
    }

    # Full nav fragment for the htmx upgrade — 200 (authed) or 401 (anon).
    # MUST NOT redirect, or htmx would swap the sign-in page into the sidebar.
    handle /_nav.html {
        forward_auth oauth2-proxy:4180 {
            uri /oauth2/auth
            @unauthorized status 401
            handle_response @unauthorized {
                respond 401
            }
        }
        file_server
    }

    # Public sections — no auth required
    @public {
        path /
        path /index.html
        path /blog /blog/ /blog/*
        path /css/* /images/* /fonts/*
        path *.css *.js *.woff *.woff2 *.png *.jpg *.svg *.ico
    }
    handle @public {
        try_files {path} {path}/ {path}.html
        file_server
    }

    # Everything else — require auth, redirect to sign-in on failure
    handle {
        forward_auth oauth2-proxy:4180 {
            uri /oauth2/auth
            copy_headers X-Auth-Request-User X-Auth-Request-Email
            @unauthorized status 401
            handle_response @unauthorized {
                redir * /oauth2/sign_in?rd={scheme}://{host}{uri}
            }
        }
        try_files {path} {path}/ {path}.html
        file_server
    }
}
```

Key points:
- `handle /auth-check` and `handle /_nav.html` are separate from the public and protected handlers, and both `respond 401` on failure rather than redirecting
- Public paths are listed explicitly in the `@public` matcher; protected paths fall through to the catch-all `handle`, which *does* redirect humans to the sign-in page
- The `rd` query parameter preserves the original URL so the user returns to the right page after signing in

### nginx example

```nginx
server {
    listen 443 ssl;
    server_name docs.example.com;

    root /var/www/docs;
    index index.html;

    # oauth2-proxy backend
    location /oauth2/ {
        proxy_pass http://oauth2-proxy:4180;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Internal subrequest target
    location = /auth-check {
        internal;
        proxy_pass http://oauth2-proxy:4180/oauth2/auth;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }

    # Auth check exposed to JS — 200 or 401, no redirect
    location = /_auth-check {
        auth_request /auth-check;
        return 200;
        error_page 401 = @deny_401;
    }

    # Full nav fragment for the htmx upgrade — 200 (authed) or 401 (anon)
    location = /_nav.html {
        auth_request /auth-check;
        error_page 401 = @deny_401;
        try_files $uri =404;
    }

    location @deny_401 {
        return 401;
    }

    # Public sections — no auth
    location / {
        try_files $uri $uri/ $uri.html =404;
    }
    location /blog/ {
        try_files $uri $uri/ $uri.html =404;
    }

    # Protected sections — require auth, redirect humans to sign-in
    location /networking/ {
        auth_request /auth-check;
        error_page 401 = @sign_in_redirect;
        try_files $uri $uri/ $uri.html =404;
    }
    location /deployment/ {
        auth_request /auth-check;
        error_page 401 = @sign_in_redirect;
        try_files $uri $uri/ $uri.html =404;
    }
    # Add more protected locations as needed...

    location @sign_in_redirect {
        return 302 /oauth2/sign_in?rd=$scheme://$host$request_uri;
    }
}
```

Key points:
- nginx uses `auth_request` to subrequest oauth2-proxy
- `/_auth-check` (set `authCheckUrl` to it, note the underscore) and `/_nav.html` both return a bare **401** via `@deny_401` — no redirect
- Page locations redirect humans to the sign-in page via `@sign_in_redirect`
- Each protected location needs its own `auth_request` — nginx has no catch-all like Caddy's `handle`

### oauth2-proxy configuration

Both examples assume oauth2-proxy is running with at minimum:

```
--upstream=static://200
--http-address=0.0.0.0:4180
--reverse-proxy=true
--set-xauthrequest=true
--cookie-secure=true
```

The `--upstream=static://200` is important — oauth2-proxy isn't proxying to a backend, it's only handling auth. The reverse proxy (Caddy/nginx) serves the actual files.

If you want the sign-in page to redirect straight to your OIDC provider without an intermediate button, add `--skip-provider-button=true`. Note that this breaks the `rd` (redirect) parameter — after signing in, users will always land on `/` instead of the page they were trying to access. If you need the redirect to work, keep the provider button and consider [customising the sign-in template](https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview#custom-templates) to match your site's look.
