# Deployment

Frontend on Vercel, backend on Render. The two are **cross-site**, which is what
makes the cookie and CORS settings below non-optional.

## Vercel (frontend)

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://<api-host>/api` |

The `VITE_` prefix is mandatory — Vite only exposes prefixed variables to the
client bundle, and the value is baked in at **build** time, so a change requires
a redeploy, not just a restart. A non-`VITE_`-prefixed name (e.g. `API_URL`) is
silently `undefined` at runtime; `src/api/client.ts` now throws with an
explanatory message rather than letting every request fall back to a relative
path against the Vercel origin.

## Render (backend)

Set the settings module, then everything it reads:

| Variable | Required | Notes |
| --- | --- | --- |
| `DJANGO_SETTINGS_MODULE` | yes | `config.settings.production` |
| `SECRET_KEY` | yes | long random string |
| `ALLOWED_HOSTS` | yes | comma-separated; currently `https://splitwise-ten-ebon.vercel.app,splitwise-3m6a.onrender.com` |
| `DATABASE_URL` | yes | Postgres; SSL is required |
| `CORS_ALLOWED_ORIGINS` | yes | comma-separated Vercel origins — the CORS middleware is configured for credentials, so a missing entry blocks every request |
| `DEFAULT_FROM_EMAIL` | yes | |
| `BREVO_API_KEY` | yes | outbound email |
| `STORJ_ACCESS_KEY` / `STORJ_SECRET_KEY` / `STORJ_ENDPOINT` / `STORJ_BUCKET_NAME` | yes | image uploads |
| `DJANGO_ENV` | no | fallback if `DJANGO_SETTINGS_MODULE` is unset |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | no | default to `true` / `None` in production; only relax for a same-origin setup |
| `SECURE_SSL_REDIRECT` | no | default `true` |
| `SECURE_HSTS_SECONDS` | no | default `31536000` |

### Password reset links

There is no `FRONTEND_URL` variable. The emailed reset link is derived from
`ALLOWED_HOSTS` by `_frontend_url_from_allowed_hosts()`, which takes the first
non-empty entry and adds the scheme back — `https` unless the host is loopback,
which gets `http` plus Vite's dev port.

So the first entry of `ALLOWED_HOSTS` must be the **frontend** origin. Today
that is the Vercel URL, which already carries a scheme and is passed through
verbatim:

```
https://splitwise-ten-ebon.vercel.app/reset-password?uid=<b36>&token=<token>
```

If the entry order is ever swapped so the Render host comes first, reset emails
will link to the API instead of the app. `FrontendUrlFromAllowedHostsTests`
pins the current value, including a check that the API host never appears in
the link.

`DJANGO_SETTINGS_MODULE` is read by both `manage.py` and `config/wsgi.py`, so
Render's `python manage.py migrate` and gunicorn load the same settings. If you
prefer `DJANGO_ENV=production` instead, that works too — but set only one, and
`DJANGO_SETTINGS_MODULE` takes precedence.

Add the Vercel **preview** origins to `CORS_ALLOWED_ORIGINS` too, otherwise
every PR deployment will fail CORS.

## Local development

```bash
cp frontend/.env.example frontend/.env.local   # VITE_API_URL=http://localhost:8000/api
mise run dev                                    # django on :8000, vite on :3000
```

`config.settings.development` forces `SameSite=Lax` / `Secure=False` so plain-http
localhost keeps working regardless of what is in your shell environment.

## Not covered here

- **Static files.** With `DEBUG=False` nothing serves `STATIC_ROOT`, so Django
  admin will render unstyled. Needs `whitenoise` (or a separate static host).
- **Token refresh.** `frontend` never calls `/core/refresh/token/`, and that path
  is *not* under the `/api` prefix, so a single `VITE_API_URL` cannot reach it.
  Past the 60-minute `ACCESS_TOKEN_LIFETIME` users are silently logged out.
- **Cookie persistence.** `set_jwt_cookies` sets no `max_age`/`expires`, so both
  tokens are session cookies that are dropped when the browser closes.
