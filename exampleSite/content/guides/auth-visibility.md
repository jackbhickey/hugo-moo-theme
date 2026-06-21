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

## Beyond the nav: embedding protected content

The sidebar is just the first use of one general idea:

> Serve a **public skeleton**, then let htmx swap in **protected fragments fetched from proxy-gated URLs** once the visitor is authenticated.

`/_nav.html` is one such fragment. The same move works *inside a page* to hide specific content from anonymous visitors — under the same rule that keeps the nav safe:

**The protected bytes must live only at a URL your proxy gates. Never render them into the public page.** A wrapper that hides inline content with CSS is not secure — it ships the content and merely hides it.

### The `auth-include` shortcode

Put the protected content in its own page marked `public: false`, then embed it from a public page:

```text
{{</* auth-include page="/internal/runbook/" select=".prose" /*/>}}
```

That renders **only** a placeholder into the public page — the real content is never in this HTML:

```html
<div class="auth-include" hx-get="/internal/runbook/" hx-trigger="load"
     hx-target="this" hx-swap="outerHTML" hx-select=".prose">
  <p><em>Sign in to view this content.</em></p>
</div>
```

- `page` — URL of the gated content (required).
- `select` — optional CSS selector ([`hx-select`](https://htmx.org/attributes/hx-select/)) that extracts a region from `page`; omit it if `page` already returns a bare fragment (like the `nav-fragment` layout).
- Override the anonymous placeholder with the paired form: `{{</* auth-include page="/internal/x/" */>}}Members only.{{</* /auth-include */>}}`.

Anonymous visitors keep the placeholder (their fetch is refused); authenticated visitors get the content swapped in. Requires auth to be enabled — htmx is only loaded when `authCheckUrl` is set.

### Handling it in the reverse proxy

A protected page normally **302-redirects** anonymous humans to sign-in — but htmx must receive a **401** instead (a 302 would make htmx follow the redirect and swap the *sign-in page* into your content). htmx adds an **`HX-Request: true`** header to every fetch, which is the discriminator. Two strategies:

**1. Dedicated fragment endpoint — simplest, most portable.** Serve the content at a URL meant only for embedding that *always* returns 401 to anonymous requests, exactly like `/_nav.html`. No header logic; the `/_nav.html` Caddy/nginx blocks above are the template, and it behaves identically under Envoy.

**2. Reuse a human-navigable page.** If the same page should also be directly reachable (humans redirected to sign-in, htmx gets a clean 401), branch on `HX-Request`:

*Caddy* — inside the protected `handle`'s unauthorized response:

```caddy
handle_response @unauthorized {
    @htmx header HX-Request true
    route {
        respond @htmx 401
        redir * /oauth2/sign_in?rd={scheme}://{host}{uri}
    }
}
```

*nginx*:

```nginx
location /internal/ {
    auth_request /auth-check;
    error_page 401 = @auth_required;
    try_files $uri $uri/ $uri.html =404;
}
location @auth_required {
    if ($http_hx_request = "true") { return 401; }
    return 302 /oauth2/sign_in?rd=$scheme://$host$request_uri;
}
```

*Envoy* — gate with the `ext_authz` HTTP filter pointing at oauth2-proxy's `/oauth2/auth`, which returns **401** on denial. Envoy forwards that 401 to the client by default — already what htmx needs:

```yaml
http_filters:
- name: envoy.filters.http.ext_authz
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
    transport_api_version: V3
    http_service:
      server_uri: { uri: oauth2-proxy:4180, cluster: oauth2-proxy, timeout: 2s }
      path_prefix: /oauth2/auth
      authorization_request:
        allowed_headers:
          patterns: [{ exact: cookie }, { exact: hx-request }]
      authorization_response:
        allowed_upstream_headers:
          patterns: [{ exact: x-auth-request-user }, { exact: x-auth-request-email }]
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

Because a 401 is the right default for htmx, embedding needs nothing extra under Envoy. Redirecting *human* visitors to sign-in is the part that differs from Caddy/nginx — send them through oauth2-proxy's `/oauth2/start?rd=…`, e.g. a route matched on the *absence* of `hx-request`, or an Envoy `local_reply` that rewrites the 401 to a 302 for non-htmx requests. For most setups it's simpler to use strategy 1 (a dedicated always-401 fragment) under Envoy.

> **Caching:** like `/_nav.html`, these gated fragments must never be cached for anonymous requests. They're cookie-gated, so a correctly configured CDN won't cache them — just don't put a blanket `Cache-Control: public` on those paths.

## Future features

### Inline protected sections

`auth-include` keeps the protected content in a *separate* page. A nicer authoring experience would mark a region **inline** in the host page:

```text
{{</* protected */>}}
Only authenticated readers see this paragraph.
{{</* /protected */>}}
```

The catch is the security rule: that body must **not** appear in the public page's HTML, so inline authoring needs a second render of the page that only the proxy-gated path serves. The sketch:

1. Add a custom Hugo **output format** (e.g. `PROTECTED`) to the page, published at a path the proxy 401-gates (e.g. `/_protected/<page>/`).
2. The `protected` shortcode renders **differently per output**: in the default HTML output it emits a placeholder `<div hx-get="…the PROTECTED url…" hx-select="#blk-N">`; in the `PROTECTED` output it emits the real body wrapped in `#blk-N`.
3. htmx pulls each block from the gated output and selects its region in.

That keeps the prose inline in one source file while still never shipping it to anonymous visitors. It's more moving parts than `auth-include` (an output format, per-block ids, and a proxy rule for the protected output), so it isn't built yet.
