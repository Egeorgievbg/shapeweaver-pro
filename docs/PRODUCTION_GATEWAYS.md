# GPTSBOXES production gateways

Configure the browser to use same-origin endpoints:

- `VITE_BOXCRAFT_API_BASE_URL=/api/boxcraft`
- leave `VITE_ADMIN_API_BASE_URL` empty to use `/api/admin`

Configure these values only in the server environment. Never expose them through `VITE_*` variables:

- `BOXCRAFT_UPSTREAM_URL` — read-only product and asset API
- `GPTSBOXES_ADMIN_ACCESS_KEY` — administrator sign-in key
- `GPTSBOXES_ADMIN_SESSION_SECRET` — long random HMAC session secret
- `GPTSBOXES_ADMIN_UPSTREAM_URL` — protected administration API
- `GPTSBOXES_ADMIN_UPSTREAM_TOKEN` — server-side bearer credential

The browser receives only same-origin URLs and an HttpOnly signed session cookie. Administration credentials are never stored in localStorage or included in the client bundle.
