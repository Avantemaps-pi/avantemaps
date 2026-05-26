# CI Workflows

## Lighthouse CI (Mobile) — `lighthouse-ci.yml`

Runs Google Lighthouse against the deployed Avanté Maps URL
(`https://testnet.avantemaps.com`) under a mobile emulation profile
(Pixel-class viewport, 4× CPU throttling, ~Slow 4G network).

### When it runs

- On every push to `main` that touches frontend code or the workflow.
- Daily at 06:00 UTC (catches regressions from data/CDN changes).
- Manually via the "Run workflow" button (`workflow_dispatch`).

### What it checks

Configured in [`lighthouserc.json`](../../lighthouserc.json). The build
**fails** if any of the following drop below threshold (averaged over 3 runs):

| Metric / Category          | Threshold        | Severity |
| -------------------------- | ---------------- | -------- |
| Performance score          | ≥ 0.75           | error    |
| Accessibility score        | ≥ 0.90           | error    |
| Best Practices score       | ≥ 0.90           | error    |
| SEO score                  | ≥ 0.90           | error    |
| Largest Contentful Paint   | ≤ 4000 ms        | error    |
| Total Blocking Time        | ≤ 400 ms         | error    |
| Cumulative Layout Shift    | ≤ 0.10           | error    |
| Text compression (gzip/br) | required         | error    |

FCP, Speed Index, and image-optimization audits are warnings (won't fail
the build, but appear in the report).

### Audited URLs

- `/` — landing / map
- `/recommendations`
- `/about`

Edit `lighthouserc.json` → `ci.collect.url` to add or remove pages.

### Reports

Each run uploads HTML reports as an artifact (`lighthouse-reports`,
retained 14 days) and also publishes them to Lighthouse's temporary
public storage — the URL is printed in the job log.

### Optional: GitHub status checks

To get inline PR comments, install the
[Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) and add
its token as the `LHCI_GITHUB_APP_TOKEN` repository secret. Without the
token the workflow still runs and still fails on regressions — you just
won't get the status-check UI.

### Tuning thresholds

If the deployed site legitimately can't meet a threshold (e.g. heavy map
tiles inflate LCP), lower the value in `lighthouserc.json` rather than
removing the assertion — keeps the regression guard in place.
