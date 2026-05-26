# End-to-end performance tests

Playwright tests that run against a live preview of the app.

## Setup (one-time)

```bash
bun add -d @playwright/test     # already in devDependencies
bunx playwright install chromium
```

## Running

Against a local Vite dev server (default):

```bash
bun run dev                     # in one terminal
bunx playwright test            # in another
```

Against the deployed preview:

```bash
PREVIEW_URL=https://avantemaps.lovable.app bunx playwright test
```

## Tests

- `hero-cache.spec.ts` — verifies the hero logo (`avante-icon-*.webp`) and
  business/place hero images are served from the browser cache on the second
  visit to `/`. Fails if any hero asset is re-downloaded with a fresh
  `200 OK` body after navigating away and back.
