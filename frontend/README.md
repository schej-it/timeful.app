# Frontend

## Project setup

```sh
npm install
cp ../.env.development.example ../.env.development
```

Set these required frontend tooling variables in `../.env.development` before starting Vite or Playwright:

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

The dev server proxies `/api` and `/swagger` to `VITE_API_PROXY_TARGET` from the repo-root `.env.development` file.

For production-style local builds and preview:

```sh
cp ../.env.production.example ../.env.production
npm run build
npm run preview
```

See `../docs/environments.md` for the full root-env contract.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
```
