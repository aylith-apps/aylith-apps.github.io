# aylith-com — Claude Code guidance

<!-- aylith-handbook:start -->
> **📖 Aylith handbook (authoritative).** This repo is part of the `aylith-labs` lab. Before any
> cross-repo, catalog, design-system, CI/runner, or data-flow work you **must** consult the org
> handbook — the single source of truth for these conventions:
> https://github.com/aylith-labs/aylith-handbook (locally `../aylith-handbook/`, skill `aylith-labs`).
<!-- aylith-handbook:end -->

## Project Overview

Public umbrella marketing site + product catalog for the `aylith-labs` lab, served at aylith.com. Fully prerendered static SvelteKit app (SvelteKit 2 / Svelte 5 runes, Tailwind v4, Vite 8) living in the `landing/` subdirectory. It does not author catalog content — it collects each org repo's `.aylith/project.md` at build time and renders the merged set. Meta-repo (carries the `aylith-meta` topic, excluded from its own catalog).

## Commands

Run from `landing/` (Node 22+):

```bash
cd landing
npm install
npm run dev        # Vite dev server, http://localhost:5847
npm run collect    # fetch org .aylith/project.md → .generated/projects/ (needs CATALOG_GITHUB_TOKEN; optional locally)
npm run build      # prerendered static output → landing/build
npm run preview    # serve the build, http://localhost:5848
npm run check      # svelte-kit sync && svelte-check --tsgo (TS + Svelte diagnostics)
npm run check:links # walk build/ and fail on a broken internal link (run after build)
npm test           # vitest — manifest transforms, snapshot loader, sitemap, link classification
npm run lint       # biome check . (read-only; lint:fix writes)
```

**npm only.** `landing/package-lock.json` is the single lockfile; CI pins `npm ci` with the npm cache.

No runtime env vars — fully static, no backend.

## Architecture

- **Static-first.** `adapter-static`, `prerender = true` in the root layout; build emits a plain HTML/asset folder, no server.
- **Catalog is collected, not authored here.** `landing/scripts/collect.mjs` enumerates the `aylith-labs` org via `@octokit/rest`, skips archived repos and any with the `aylith-meta` topic, fetches each `.aylith/project.md`, and writes the merged set into gitignored `landing/.generated/projects/`. A repo with no manifest still appears as a "Planning" placeholder.
- **Snapshot fallback.** `src/lib/server/markdown.ts` reads `.generated/projects` when present, else the committed snapshot in `src/content/projects/` — so dev and tokenless builds work.
- **Self-refreshing.** Deploy fires on push to `main`, a `catalog-refresh` `repository_dispatch` from any product repo, an hourly cron, or manual dispatch; builds and deploys to GitHub Pages.
- Key dirs: `landing/src/routes/` (pages incl. `/projects`, `/projects/[slug]`, `/design`, `sitemap.xml`), `landing/src/lib/` (`actions/`, `brand/`, `components/`, `server/`, `stores/`), `landing/static/` (CNAME, favicons, brand avatars), `.aylith/project.schema.json` (manifest contract).

## Changelog system

Product changelogs live HERE, not in the product repos (CHANGELOG.md is retired
umbrella-wide). One mdsvex `.svx` file per shipped change at
`landing/src/content/changelogs/<slug>/YYYY-MM-DD-<title>.svx` (slug = repo name),
rendered at `/projects/<slug>/changelog` and exposed as prerendered JSON at
`/api/changelog/<slug>.json`. The newest entry with a `hero:` block provides the
theme-aware screenshot on the `/projects/<slug>` detail page.

**When any aylith-labs repo ships a user-visible change, follow the
`aylith-changelog-entry` skill** (capture light/dark media → upload to
media.aylith.com → author the entry → build + push). Entry format, component
catalog (ThemedShot/ThemedClip/BeforeAfter/Diagram in
`landing/src/lib/components/changelog/`), and capture technique are documented
in the skill.

- Media is never committed here (small SVGs and brand logos are the exception);
  screenshots and clips load from https://media.aylith.com.
- Theme swap is class-based (`.dark` on `<html>`, store `src/lib/stores/theme.svelte.ts`,
  localStorage key `theme`); media components use `dark:hidden` / `hidden dark:block`
  with reserved aspect-ratio boxes (no CLS).

## Conventions

- Catalog data is **collected at build, not edited in this repo** — to add/change a tool, edit that tool's own repo `.aylith/project.md`, not files here.
- Public repo → CI runs on GitHub-hosted runners (`vars.CI_RUNNER || 'ubuntu-latest'`).
- **`.github/workflows/ci.yml` is the gate** (lint → check → test → build → check:links) and `deploy.yml` calls it as its own `verify` job with `build: needs: verify`. Deploy fires on cron and on a dispatch from any product repo, neither of which a push/PR-only workflow would ever see, so the gate has to live inside the deploy path.
- **TypeScript is the native (Go) compiler.** `@typescript/native` is `npm:typescript@^7`; the plain `typescript` entry is pinned to `~6` because svelte-check requires both installed and refuses to start otherwise — collapsing it to a single `typescript: ^7` takes the typecheck gate down, even with `--tsgo` already on the command. Neither entry is a downgrade: `./node_modules/@typescript/native/bin/tsc --version` reports the compiler that does the checking.
- **The sitemap is generated from `src/lib/server/sitemap.ts`**, not inside the route — SvelteKit rejects non-endpoint exports from a `+server.ts`.
- Design tokens (Tailwind v4 `@theme`, keyframes, motion gating) live in `landing/src/app.css`.
- Motion is gated on `prefers-reduced-motion` + `html[data-motion]`; theme/motion resolve pre-paint via inline script in `app.html`.
- For logo/mark, favicon, avatar, or name-origin changes use the `aylith-brand-mark` skill — it owns the locked geometry, asset-sync graph, and regen recipe.
- Deploy = merge to `main`. Bump `landing/package.json` version on changes (patch fixes / minor features).
