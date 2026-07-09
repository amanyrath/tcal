# touchstonecal

Sync Touchstone Climbing gym class calendars to Google Calendar.

The Touchstone website loads events from a public GraphQL API. This tool fetches those events and publishes them as an iCal (`.ics`) feed that Google Calendar can subscribe to.

## Quick start

### Calendar UI (local dev)

```bash
# One-time / after Python changes: link local package into Vercel's dev env
./scripts/sync-dev-api.sh

# Terminal 1: Python API
vercel dev

# Terminal 2: React frontend (proxies /api to vercel dev)
cd web && npm run dev
```

Open `http://localhost:5173` for the calendar app. Pacific Pipe is the default home gym.

If categories look stale (missing affinity groups or subgroups), restart `vercel dev`
after running `pip install -e .` above. You can also hard-refresh the browser and
clear saved filters with `localStorage.removeItem('touchstonecal-state-v1')` in DevTools.

### CLI / iCal feed

```bash
# Export all Touchstone gyms (default)
python -m touchstonecal export calendar.ics

# Export one gym only
python -m touchstonecal --gym gwpower-co export calendar.ics

# Run a live feed server for all gyms (refreshes hourly)
python -m touchstonecal serve --port 8080
```

Open `http://127.0.0.1:8080/` in a browser to browse filter URLs for every gym and event type.

## Filtering by gym and event type

Each event is tagged with:

- Title prefix: `[Ironworks] Intro to Climbing Class`
- Location: gym name
- Categories: gym name + event type (class title)

### On the live server

Use query params in the feed URL:

```text
/calendar.ics                              # everything
/calendar.ics?gym=ironworks                # one gym
/calendar.ics?type=intro                   # substring match on class title
/calendar.ics?gym=gwpower-co&type=yoga     # combine filters
/calendar.ics?gym=ironworks,gwpower-co&type=intro,belay
```

Add each filtered URL as a separate Google Calendar subscription if you want separate calendars.

### CLI export

```bash
python -m touchstonecal --gym ironworks export ironworks.ics
python -m touchstonecal --type intro,yoga export intro-yoga.ics
python -m touchstonecal --gym gwpower-co --type yoga export gw-yoga.ics
```

## Auto-update setup

You only subscribe once in Google Calendar. After that, two things keep it current:

1. **This server** refetches Touchstone every hour (configurable)
2. **Google Calendar** re-downloads the feed every few hours on its own

### Option A: Local machine + tunnel (fastest to try)

```bash
python -m touchstonecal serve --port 8080
ngrok http 8080
```

In Google Calendar: Settings -> Add calendar -> From URL

```text
https://YOUR-NGROK-URL/calendar.ics?gym=ironworks&type=intro
```

Keep the server and tunnel running on your machine.

### Option B: Vercel (recommended)

```bash
npm i -g vercel
vercel
```

After deploy, open your Vercel URL and subscribe in Google Calendar:

```text
https://YOUR-APP.vercel.app/calendar.ics
https://YOUR-APP.vercel.app/calendar.ics?gym=ironworks&type=intro
```

Vercel setup included in this repo:

- `api/events.py` - JSON events API for the calendar UI
- `api/calendar.py` - iCal feed with gym/type filters
- `api/index.py` - legacy filter URL directory (superseded by SPA)
- `web/` - React calendar UI (Vite + Tailwind)
- `vercel.json` - SPA routing, build, cron (daily warm), edge cache headers

Optional Vercel env vars:

| Variable | Default | Notes |
|----------|---------|-------|
| `DAYS_AHEAD` | `30` | Use `90` on Pro (needs 60s timeout). Clamped to 1-90. |
| `CACHE_TTL_SECONDS` | `3600` | How long Vercel caches each feed |
| `GYMS` | _(unset)_ | Comma-separated gym keys to fetch/serve. Unset = all 17. Fewer gyms = faster fetch, smaller payload/cache. |
| `ALLOWED_HOSTS` | _(unset)_ | Comma-separated host allowlist for generated URLs. Unset trusts the request host. |
| `REDIS_URL` / `KV_URL` | _(unset)_ | Optional shared cache across instances (needs the `redis` package). Unset = in-memory only. |
| `LOG_LEVEL` | `INFO` | Logging verbosity (`DEBUG`/`INFO`/`WARNING`/`ERROR`). |
| `SENTRY_DSN` | _(unset)_ | Optional error tracking (needs the `sentry-sdk` package). |

#### Optional: shared cache across instances

Without this, each serverless cold start refetches all gyms. Set `REDIS_URL`
(any Redis-compatible endpoint, e.g. Upstash / Vercel KV) to share one warm
snapshot across instances.

- Enable the dependency on Vercel by setting `requirements.txt` to `-e .[redis]`
  (locally: `pip install -e ".[redis]"`).
- Snapshots are gzip-compressed. All 17 gyms at `DAYS_AHEAD=30` is ~570 KB,
  which fits the ~1 MB value limit on Upstash/Vercel KV **free** tiers.
- `DAYS_AHEAD=90` compresses to ~1.7 MB, which exceeds the free 1 MB per-request
  limit. Use a paid tier for 90-day feeds, or keep `DAYS_AHEAD<=30` on free.
- The cache is best-effort: any Redis error is logged and falls back to
  in-memory, so a cache outage never breaks the feed.

Hobby plan has a 10s function timeout. Default `DAYS_AHEAD=30` fits that.
Hobby cron jobs can only run once per day (`0 14 * * *`, 2pm UTC). The feed
also refreshes when Google Calendar requests it after the edge cache expires.
Pro plan allows hourly cron, `maxDuration: 60`, and `DAYS_AHEAD=90`.

### Option C: Fly.io / Docker

```bash
fly launch --no-deploy
fly deploy
```

Then subscribe to:

```text
https://YOUR-APP.fly.dev/calendar.ics
https://YOUR-APP.fly.dev/calendar.ics?gym=gwpower-co&type=yoga
```

Docker works too:

```bash
docker build -t touchstonecal .
docker run -p 8080:8080 touchstonecal
```

### What to expect

- New classes appear after the next server refresh (default: 1 hour)
- Google may take a few more hours to show changes
- Cancelled classes disappear on the next refresh cycle
- No Google OAuth or API keys needed

## Options

```bash
python -m touchstonecal export --days 120 out.ics
python -m touchstonecal serve --days 90 --refresh-seconds 1800 --port 8080
```

## Supported gyms

All 17 Touchstone gyms are included when using the default `--gym all`:

Berkeley Ironworks, Class 5, Cliffs of Id, Diablo Rock Gym, Dogpatch Boulders, Great Western Power Co, Hollywood Boulders, Hyperion, LA Boulders, Metalmark, Mission Cliffs, Pacific Pipe, Sacramento Pipeworks, The Oaks, The Post, The Studio, Verdigo Boulders.

Use `--gym gwpower-co` (or any gym key) to limit the feed to one location.

## Notes

- No authentication required; uses the same public API as the website embed
- Events include class title, time, availability, and a link back to the gym calendar
- Cancelled or removed classes disappear on the next feed refresh
