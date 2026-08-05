# ClypDat marketing site

Landing page for [ClypDat](https://github.com/ClypDat/ClypDat), built with
Next.js (App Router) + Tailwind CSS 4.

## Developing

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `app/page.tsx` assembles the page from `app/components/`.
- Download links point at `/download/<asset>`, which redirects to GitHub's
  `releases/latest` while GitHub is up and to the R2 mirror when it is not.
  Either way there is no version to keep in sync here.
- Assets (icon, game covers) are copied from the main repo's `/assets`.

## Release mirror

GitHub is the source of truth. The mirror keeps downloads and in-app updates
working when GitHub is unreachable - an outage, or the account being flagged.
Nothing prefers the mirror while GitHub answers.

Three pieces:

- `app/download/[asset]/route.ts` - stable download URLs. Probes GitHub (cached
  60s), redirects there if it answers, to R2 otherwise. Always a 302, never a
  proxy: streaming a 277 MB installer through the function would bill every
  download as Vercel bandwidth.
- `app/api/releases/latest` and `app/api/releases` - the app updater's fallback.
  Serve snapshots written to R2 by the sync script, in the exact shape of the
  GitHub releases API. These never call GitHub; proxying it would fail in the
  one situation they exist for.
- `scripts/mirror-sync.mjs` - uploads the current release to R2.

Only the latest release's binaries are mirrored (~1.1 GB), overwritten in place,
so storage stays flat. Older versions stay on GitHub - the mirror is a lifeline
for installing and updating, not a release archive. Well inside R2's 10 GB free
tier, and R2 egress is free, so downloads cost nothing.

### Publishing to the mirror

After publishing a GitHub release:

```bash
pnpm mirror:push
```

Reads `.env.local` (git-ignored):

```ini
R2_ACCOUNT_ID=...
R2_BUCKET=clypdat-releases
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
MIRROR_BASE_URL=https://mirror.clypdat.xyz   # public R2 base
SITE_BASE_URL=https://www.clypdat.xyz        # must match MirrorHost in AppUpdateService.cs
GITHUB_TOKEN=...                             # optional, raises the API rate limit
```

Skips if the mirror already has the current tag; `--force` re-uploads.

Runnable from a laptop on purpose. A GitHub Action is the convenient path, but
it dies with the account - which is the scenario being insured against.

Vercel needs one env var of its own: `MIRROR_BASE_URL`. Without it every route
falls back to GitHub-only behaviour, which is what local dev and previews get.

## Building

```bash
pnpm build
```

Produces a static-friendly Next.js build in `.next/`.

## Deploying

Hosted on Vercel. The repo root is the .NET app, so when importing the
project in Vercel's dashboard, set **Root Directory** to `web` - framework
preset and build/install commands then auto-detect. Every push to `master`
deploys; PRs get preview URLs.
