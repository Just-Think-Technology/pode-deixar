# Content Security Policy

Centralized in `@pode-deixar/security` (`getHelmetConfig()`), applied in all
5 services via `app.use(getHelmetConfig())`.

- `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`
- `script-src`/`style-src` allow `'unsafe-inline'` only for Swagger UI
- HSTS (1 year, includeSubDomains, preload), `X-Frame-Options: DENY`
