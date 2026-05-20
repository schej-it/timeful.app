# Frontend

## Project setup

```sh
npm install
cp .env.template .env.local
```

Set these required local tooling variables in `.env.local` before starting Vite or Playwright:

- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_API_PROXY_TARGET`

Optional variables for `vite preview`:

- `VITE_PREVIEW_HOST`
- `VITE_PREVIEW_PORT`

## Development

```sh
npm run dev
```

The dev server proxies `/api` and `/swagger` to `VITE_API_PROXY_TARGET`.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
```
