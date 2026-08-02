# Aylith

**A lab that turns demand signals into shipped AI tools. Read the signal. Build the tool. Ship in days, not quarters.**

`aylith.com` is the public face of Aylith — a portfolio lab. The site does not sell any single tool; each tool has its own product surface elsewhere. It is the connective tissue that makes the portfolio legible as one coherent practice: read the signal, build the tool, ship in days. It shows the method, the receipts, and lets every tool stand on its own from the catalog.

The site is a fully prerendered, static SvelteKit app — intentionally lightweight, durable, and deployed automatically to GitHub Pages.

## What & Why

Founders, technical builders, and practitioners land here to answer one question: *is this lab real, or theater?* The site answers it with evidence, not adjectives — 138+ launches analyzed, every tool public from day one, and the **complete studio catalog** laid out in one index, collected straight from the repos themselves. The brand is quietly confident: warm-stone palette, Newsreader-class serif wordmark, copy that refuses superlatives and future-tense marketing. Restraint is the brand.

## Features & Sections

| Surface | What it does |
| --- | --- |
| **Hero** | Animated tally-mark + "A Y L I T H" wordmark lockup that builds itself on load (twelve monthly animation variants). Fluid type, viewport-aware. |
| **The loop** | The three-step method — Listen → Pattern → Ship — with scroll-reveal. |
| **Portfolio** | Featured tools as large cards plus a compact list of the rest, accent-coloured per tool. |
| **Projects catalog** (`/projects`) | The complete catalog — every studio tool as a card (name, tagline, one-line description, link to its detail page), collected from the org at build, with a status-mix overview and client-side category filtering (each category tab carries its count) across seven categories plus an "Unsorted" bucket for placeholders. Responsive, light + dark, no layout shift. |
| **Project detail** (`/projects/[slug]`) | Per-tool page rendered from Markdown: tagline, description, features, target user, long-form body. |
| **About** (`/about`) | The lab's posture in three short paragraphs. |
| **Design system** (`/design`) | Live brand reference — mark readings, wordmark variants, palette, motion controls, copy-to-clipboard tokens. |
| **SEO & social** | Per-page `<title>`/description, canonical URLs, Open Graph + Twitter cards, `og:image`, `apple-touch-icon`, `theme-color`, a generated `sitemap.xml` (static routes + every collected project slug), and `robots.txt`. |
| **404 / error** | On-brand error page. |
| **Settings menu** | Theme (system / light / dark) and motion (system / reduced / full) preferences, persisted. |

Brand details: a Konami-code easter egg and a styled console signature live in the root layout.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | SvelteKit 2 (Svelte 5 runes) |
| Language | TypeScript 7 (native compiler, via `svelte-check --tsgo`) |
| Styling | Tailwind CSS v4 (`@theme` tokens via `@tailwindcss/vite`) + `@tailwindcss/typography` |
| Build | Vite 8 |
| Adapter | `@sveltejs/adapter-static` (full SSG — every route prerendered) |
| Content | Per-repo `.aylith/project.md` manifests, collected at build via `@octokit/rest`, parsed with `gray-matter` + `marked` |
| Fonts | Space Grotesk (display) + DM Sans (body), via Google Fonts |
| Quality | `svelte-check` (TypeScript + Svelte diagnostics), Biome (lint), Vitest, prerendered-output link check |
| Hosting | GitHub Pages (Actions → Pages) on the custom domain `aylith.com` |

## Architecture

- **Static-first.** Every route is prerendered (`adapter-static`, `prerender = true` in the root layout). There is no runtime server; the build emits a folder of HTML and assets.
- **The catalog is collected, not authored here.** Each tool describes itself in its own repo via a `.aylith/project.md` manifest (frontmatter + Markdown body). At build time `scripts/collect.mjs` enumerates the `aylith-labs` org (octokit), skips archived repos and any carrying the `aylith-meta` topic, fetches each manifest, and writes the merged set into the gitignored `landing/.generated/projects/`. A repo with no manifest still appears — as a "Planning" placeholder built from its GitHub name + description. `src/lib/server/markdown.ts` reads `.generated/projects` when present, else falls back to the committed snapshot in `src/content/projects/` so local dev and tokenless builds work. Adding a tool to the catalog = create one repo with a `.aylith/project.md` (or nothing — it shows as a placeholder). The manifest schema is documented at `.aylith/project.schema.json`.
- **The catalog rebuilds on any org push.** Each product repo carries `.github/workflows/notify-catalog.yml`, which fires a `repository_dispatch` (`catalog-refresh`) at this repo on push to its default branch; the deploy workflow also runs hourly on `schedule` as a safety net for brand-new / not-yet-adopted repos.
- **SEO is centralized.** A single `Seo.svelte` component sets per-page head tags (title, description, canonical, Open Graph, Twitter) on the home, about, design, projects, and project-detail pages. The `sitemap.xml` endpoint enumerates the static routes plus every project slug derived from the same content source, so it stays complete and in sync automatically.
- **Theme & motion before paint.** A tiny inline script in `app.html` resolves theme and motion preferences from `localStorage` + system queries before first paint, so nothing flashes. Reactive stores (`theme.svelte.ts`, `motion.svelte.ts`) keep them current after hydration.
- **Motion is gated.** Reveal / tilt / draw / count-up actions (`src/lib/actions/`) all honour `prefers-reduced-motion` and the user's motion preference via `html[data-motion]`.
- **Brand as code.** The tally-mark and wordmark are Svelte components with a monthly-rotating wordmark variant; the design system route renders them live.

## Quick Start

The app lives in the `landing/` subdirectory. Node 22+ is recommended (CI pins Node 22).

```bash
cd landing
npm install          # npm only — package-lock.json is the single lockfile
npm run dev          # dev server on http://localhost:5847
```

Build and preview the production (static) output:

```bash
npm run build        # outputs to landing/build
npm run preview      # serves the build on http://localhost:5848
```

No environment variables are required — the site is fully static and has no backend.

## Scripts

Run from `landing/`:

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite dev` | Start the Vite dev server (port 5847). |
| `npm run collect` | `node scripts/collect.mjs` | Fetch every repo's `.aylith/project.md` from the org into `.generated/projects/` (needs `CATALOG_GITHUB_TOKEN`). CI runs this before the build; locally it's optional — the build falls back to the snapshot. |
| `npm run build` | `vite build` | Produce the prerendered static site in `build/`. |
| `npm run preview` | `vite preview` | Preview the production build (port 5848). |
| `npm run check` | `svelte-kit sync && svelte-check --tsgo` | Sync SvelteKit types and type-check with the TypeScript 7 native compiler. |
| `npm run check:links` | `node scripts/check-links.mjs` | Walk `build/` and fail on any internal link that resolves to a file the build did not emit. Run after `npm run build`. |
| `npm test` | `vitest run` | Unit tests for the catalog manifest transforms, the snapshot loader, the sitemap, and link classification. |
| `npm run lint` | `biome check .` | Lint (read-only — safe as a gate). |
| `npm run lint:fix` | `biome check --write .` | Apply Biome's fixes. |
| `npm run prepare` | `svelte-kit sync` | Generate SvelteKit types (runs on install). |

## Project Structure

```
aylith.com/
├── .github/workflows/ci.yml       # lint + typecheck + test + build + link check (also called by deploy)
├── .github/workflows/deploy.yml   # GitHub Pages deploy (push / repository_dispatch / cron)
├── .aylith/
│   ├── project.schema.json        # Manifest frontmatter schema (the contract each repo fills)
│   └── templates/notify-catalog.yml   # Canonical per-repo notifier, rolled out to product repos
├── scripts/
│   └── rollout-notifier.sh        # Push notify-catalog.yml to every eligible org repo (gh)
└── landing/
    ├── scripts/collect.mjs    # Build-time collector: org repos → .generated/projects/*.md
    ├── src/
    │   ├── app.html          # Shell + pre-paint theme/motion script, base meta
    │   ├── app.css           # Tailwind v4 @theme tokens, keyframes, motion gating
    │   ├── content/
    │   │   └── projects/      # Committed snapshot — dev / tokenless-build fallback only
    │   ├── lib/
    │   │   ├── actions/        # reveal, tilt, draw, countup (motion-gated)
    │   │   ├── brand/          # Wordmark variant rotation
    │   │   ├── catalog/defaults.js # Shared constants (org, exclude topic, default icon/gradient)
    │   │   ├── components/
    │   │   │   ├── Seo.svelte   # Reusable per-page SEO / OG / Twitter head
    │   │   │   ├── brand/       # Mark, Wordmark, MotionControl
    │   │   │   ├── home/        # ProjectCard
    │   │   │   └── layout/      # Navbar, Footer, SettingsMenu
    │   │   ├── server/markdown.ts # Loader: .generated (else snapshot) → Project[]
    │   │   ├── stores/         # theme.svelte.ts, motion.svelte.ts (runes-based)
    │   │   └── types/project.ts # Project / category / status types
    │   └── routes/
    │       ├── +layout.svelte  # Navbar, Footer, easter eggs
    │       ├── +layout.server.ts # Footer project index
    │       ├── +page.svelte    # Home (hero, method, portfolio)
    │       ├── about/
    │       ├── design/         # Live design system
    │       ├── projects/
    │       │   ├── +page.svelte        # Catalog + category filter
    │       │   └── [slug]/+page.svelte # Detail (Markdown body / Planning placeholder + Source link)
    │       └── sitemap.xml/    # Prerendered sitemap endpoint
    ├── static/                 # CNAME, favicons, brand avatars, robots.txt
    ├── svelte.config.js        # adapter-static
    └── vite.config.ts          # Tailwind + SvelteKit plugins, dev/preview ports
```

## Environment Variables

The site has no runtime env vars. Two **CI secrets** drive the catalog collection:

- **`CATALOG_GITHUB_TOKEN`** (repo secret on this repo) — read-only token (`metadata:read` + `contents:read` org-wide; fine-grained PAT or GitHub App) used by `scripts/collect.mjs` to list org repos and read each `.aylith/project.md`. If unset, the deploy logs a warning and builds from the committed snapshot instead of failing.
- **`CATALOG_DISPATCH_TOKEN`** (org-level Actions secret, inherited by every repo) — used by each product repo's `notify-catalog.yml` to fire the `catalog-refresh` `repository_dispatch` at this repo. Needs permission to dispatch to `aylith-labs/aylith-com`.

Local dev needs neither — `npm run dev`/`build` fall back to `src/content/projects/`.

## Deployment

Deployed to **GitHub Pages** at the custom domain **aylith.com** (`static/CNAME`), automatically via **GitHub Actions → Pages** (`.github/workflows/deploy.yml`):

1. Triggers: push to `main`, a `catalog-refresh` `repository_dispatch` from any product repo, an hourly `schedule`, or manual `workflow_dispatch`.
2. Runs `verify` first — the whole of `ci.yml` (lint, typecheck, tests, build, link check). Nothing downstream starts until it is green. Most triggers here never involve a pull request, so this is the only thing standing between a broken commit and the live site.
3. Checks out the repo, sets up Node 22 (npm cache), runs `npm ci`, then `npm run collect` (fetches the catalog from the org; skipped with a warning if `CATALOG_GITHUB_TOKEN` is unset), then `npm run build` inside `landing/`.
4. Re-runs the link check over the collected build, as a warning rather than a failure — those pages come from other repos' manifests, and one repo's relative link should not be able to block the site's deploy.
5. Uploads `landing/build/` as a Pages artifact (`actions/upload-pages-artifact`) and deploys it (`actions/deploy-pages`).

Details:

- **Custom domain:** `aylith.com`, configured via `landing/static/CNAME` (copied into the build root).
- **Mechanism:** native GitHub Pages deployment (not a `gh-pages` branch or a `docs/` folder).
- **Concurrency:** deploys are serialized to the `pages` group with in-progress runs cancelled.
- **Permissions:** the workflow uses `pages: write` and `id-token: write`.

Because the adapter is static and every route is prerendered, the artifact is a plain folder of HTML/CSS/JS — no server runtime. The catalog refreshes itself on any org push; to deploy site changes: merge to `main`. To preview locally first: `npm run build && npm run preview`.

## Roadmap

Larger gaps intentionally left for a future pass:

- **Contact path.** No current CTA for "I want to talk to the people behind this." A contact route or email CTA is the obvious next addition once the lab decides how it wants inbound.
- **Per-project `og:image`.** Render a branded social card per tool instead of the shared studio avatar.
- **JSON-LD structured data.** Add `Organization` / `WebSite` schema for richer search results, building on the existing sitemap + canonical tags.
- **Live receipts.** The "138+ launches analyzed" figure is static copy; wiring it to the lab's actual analysis pipeline would make the headline self-updating.
- **Lint/format config.** Add ESLint/Prettier and a CI `check` step alongside the build.
