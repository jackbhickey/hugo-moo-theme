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

The theme only handles visibility. You still need your reverse proxy to actually block access to protected pages and provide the `/auth-check` endpoint. Below are complete examples for Caddy and nginx, both using [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) as the auth layer.

### The auth-check endpoint

The JS makes a `GET /auth-check` request with cookies. Your reverse proxy needs to:

- Forward the request to oauth2-proxy's `/oauth2/auth` endpoint
- If oauth2-proxy returns **200**: respond with 200 (user is authenticated)
- If oauth2-proxy returns **401**: respond with 401 (no redirect, no HTML — just the status code)

This is important — the endpoint must **not** redirect to a sign-in page on failure. The JS expects a clean 200 or 401.

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
- `handle /auth-check` is separate from the public and protected handlers
- On auth failure it returns `respond 401` — not a redirect
- Public paths are listed explicitly in the `@public` matcher
- Protected paths use `forward_auth` with a redirect to the sign-in page
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

    # Auth check — returns 200 or 401, no redirects
    location = /auth-check {
        internal;
        proxy_pass http://oauth2-proxy:4180/oauth2/auth;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }

    # Expose auth-check to JS (wraps the internal location)
    location = /_auth-check {
        auth_request /auth-check;
        auth_request_set $auth_status $upstream_status;
        return 200;

        error_page 401 = @auth_check_denied;
    }
    location @auth_check_denied {
        return 401;
    }

    # Public sections — no auth
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location /blog/ {
        try_files $uri $uri/ $uri.html =404;
    }

    # Protected sections — require auth
    location /networking/ {
        auth_request /auth-check;
        auth_request_set $auth_user $upstream_http_x_auth_request_user;

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
- The `/auth-check` location is `internal` — only accessible via `auth_request`
- `/_auth-check` wraps it as a public endpoint for the JS to fetch
- Set `authCheckUrl` to `/_auth-check` in your `hugo.toml` (note the underscore)
- Each protected location needs its own `auth_request` directive — nginx doesn't have Caddy's catch-all `handle` pattern
- `error_page 401` redirects to the sign-in page with the original URL preserved

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
