# GPTSBOXES production gateways / Production шлюзове

## Български

Браузърът трябва да използва само адреси от същия домейн:

- `VITE_BOXCRAFT_API_BASE_URL=/api/boxcraft`
- оставете `VITE_ADMIN_API_BASE_URL` празна, за да се използва `/api/admin`

Следните стойности се задават само в сървърната среда и никога не се публикуват чрез `VITE_*` променливи:

- `BOXCRAFT_UPSTREAM_URL` — read-only API за продукти и файлове
- `GPTSBOXES_ADMIN_ACCESS_KEY` — ключ за административен вход
- `GPTSBOXES_ADMIN_SESSION_SECRET` — дълъг случаен HMAC secret за сесията
- `GPTSBOXES_ADMIN_UPSTREAM_URL` — защитен административен API
- `GPTSBOXES_ADMIN_UPSTREAM_TOKEN` — server-side bearer credential

Браузърът получава единствено same-origin адреси и подписана HttpOnly cookie сесия. Административните ключове не се пазят в localStorage и не се включват в клиентския bundle.

## English

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
