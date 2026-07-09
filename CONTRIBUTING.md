# Contributing

## Layout

- `touchstonecal/` - stdlib-only Python package (scraping, iCal/JSON building, CLI, cache).
- `api/` - Vercel serverless handlers that reuse the package.
- `web/` - React + Vite + Tailwind calendar UI.
- `tests/` - Python tests (`pytest`).

## Python

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"          # add ,redis / ,sentry for optional backends
pytest -q
```

Optional extras:

- `pip install -e ".[redis]"` - shared cross-instance cache (`REDIS_URL`/`KV_URL`).
- `pip install -e ".[sentry]"` - error tracking (`SENTRY_DSN`).

## Web

```bash
cd web
npm ci
npm run lint         # oxlint
npm run typecheck    # tsc
npm run test         # vitest
npm run build
```

## Local development

```bash
./scripts/sync-dev-api.sh   # link local package into vercel dev env
vercel dev                  # terminal 1: Python API
cd web && npm run dev       # terminal 2: React UI (proxies /api)
```

## Configuration

Copy `.env.example` to `.env`. See the env var table in `README.md` for
`DAYS_AHEAD`, `CACHE_TTL_SECONDS`, `GYMS`, `ALLOWED_HOSTS`, `REDIS_URL`,
`LOG_LEVEL`, and `SENTRY_DSN`.

## CI

`.github/workflows/ci.yml` runs the Python matrix, the web lint/typecheck/test/build,
and a dependency audit on every push and pull request. Keep it green.
