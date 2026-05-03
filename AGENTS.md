# StrainScout MD — agent guide

## The web app lives in `web_2/`. There is no `web/` folder.

`web_2/` is the production Next.js 16 static-export app. Anything UI- or
frontend-related — pages, components, styles, client logic, the `out/` build
that ships to IONOS — is in `web_2/`.

If you find yourself about to edit something at a path starting with `web/`,
**stop**. That folder no longer exists. Edit the corresponding file under
`web_2/src/` instead.

## History

Through Mar 23 2026 the app was a Vite SPA at `web/` (client + Express
server + Drizzle). It was rewritten as a Next.js static export and moved to
`web_2/` in commits `311bda60` ("web 2 buildout and transfer to next.js")
and `4575e25f` ("Merge web_2 Next.js app into main repo as tracked files").

Between then and May 3 2026 several commits accidentally landed in `web/`
because both folders were sitting side-by-side and agents pattern-matched on
whichever they grepped first. Those changes shipped to nobody — production
has been built out of `web_2/` since Mar 23.

The `web/` folder was deleted on the `claude/remove-old-web-folder-HiKLf`
branch to remove the foot-gun. If you need to recover anything from the
old Vite SPA, check git history before commit `<this PR's merge commit>`.

## Where things are

- `web_2/` — Next.js app (production frontend)
- `web_2/AGENTS.md` — Next.js–version-specific rules for this app
- `pipeline/`, `scraper/` — Python data pipeline that produces `data/output/strainscout_catalog_v10.json`
- `publish/upload_ionos.py` — SFTP uploader. Only Next.js paths remain (`--next-deploy`, `--next-incremental`)
- `deploy.sh` — local one-command deploy. Builds `web_2/` and uploads
- `.github/workflows/deploy.yml`, `pipeline.yml` — CI deploys; both target `web_2/` only

## When you're confused which folder to edit

The answer is `web_2/`. Always.
