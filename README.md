# ClypDat marketing site

Landing page for [ClypDat](https://github.com/ClypLabs/ClypDat), built with
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

Skips if the mirror already has the current tag. If the tag matches but the
release notes have changed - they get written after publishing - it refreshes
just the snapshots and leaves the 1.1 GB of binaries alone. `--force`
re-uploads everything.

Runnable from a laptop on purpose. The workflow below is the convenient path,
but it dies with the account - which is the scenario being insured against.

### Staying current automatically

`.github/workflows/mirror.yml` runs the same script:

- every 6 hours, so a missed or failed sync self-corrects
- on `repository_dispatch` (`release-published`), fired by the app repo's
  release workflow, so a new release mirrors within a minute
- on manual dispatch, with an optional force flag

Repository secrets it needs: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, and `RELEASE_READ_TOKEN` (a PAT with read access to
`ClypLabs/ClypDat` - the built-in `GITHUB_TOKEN` is scoped to this repo only).
Repository variables: `MIRROR_BASE_URL`, `SITE_BASE_URL`.

The app repo needs `MIRROR_DISPATCH_TOKEN` (a PAT that can dispatch to this
repo) for the release-triggered path. Without it the release workflow logs a
note and the 6-hour schedule picks the release up instead.

Vercel needs one env var of its own: `MIRROR_BASE_URL`. Without it every route
falls back to GitHub-only behaviour, which is what local dev and previews get.

## Building

```bash
pnpm build
```

Produces a static-friendly Next.js build in `.next/`.

## Accounts and authentication

The `/account` page supports optional ClypDat accounts with email/password,
Google, and Discord sign-in. The account API is handled by Better Auth at
`/api/auth/*`, using the Neon Postgres database connected through Vercel.
Normal recording remains accountless; an account is needed for cloud-connected
features such as Xbox linking.

Before enabling authentication on a deployment, add these Vercel environment
variables (see `.env.example`): `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and
`DATABASE_URL`. Add Google and Discord client credentials when those providers
are registered. Keep all secret values server-only.

### Xbox linking

Xbox linking starts from a signed-in ClypDat account at `/account`. Add
`XBOX_CLIENT_ID` in Vercel using the Microsoft Entra application ID, and add
the client secret as the sensitive `XBOX_CLIENT_SECRET` variable. Register
this exact Web redirect URI in that app registration:

```text
https://www.clypdat.xyz/api/xbox/callback
```

The optional `XBOX_REDIRECT_URI` variable can override it for a different
deployment. The server uses PKCE and stores only an encrypted Xbox refresh
token; it never sends Xbox tokens to the browser. The first successful link
creates the small `clypdat_xbox_account` table automatically in Neon.

After pulling the Vercel development variables locally, create Better Auth's
tables with:

```bash
pnpm auth:migrate
```

Run that once against the Neon database before testing sign-up. Email
verification and password-reset delivery still require a transactional email
provider; they are intentionally not claimed as enabled until one is
configured.

## Deploying

Hosted on Vercel. The repo root is the .NET app, so when importing the
project in Vercel's dashboard, set **Root Directory** to `web` - framework
preset and build/install commands then auto-detect. Every push to `master`
deploys; PRs get preview URLs.
