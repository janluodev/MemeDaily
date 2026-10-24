# PROJECT_MAP

## Project Goal
- **Business goal:** give content, marketing, and communications teams a concise daily
  reference desk for Chinese internet memes and useful everyday-life news.
- **Current stage:** a live, dual-feed, static product with evidence-backed content,
  conservative publication gates, permanent archives, and locally scheduled trusted
  publishing.
- **Success standard:** trusted validation is the only path to publication; a failed or
  missing run leaves the last valid site online and opens an incident until that feed
  reaches a current-policy, editorially complete 3–10-item result for the day.

## Constraints
- **Collection:** public web intelligence only. No login cookies, private-platform
  extraction, anti-bot circumvention, downloaded media, or comment archives.
- **Hosting:** GitHub Pages at `memedaily.fun`; the repository and generated site are
  public and must contain no secrets or private company material.
- **Storage:** one JSON envelope per feed and date in git; no database, Supabase, runtime
  API, or paid model API in the product.
- **Safety:** meme candidates are dropped conservatively for politics, disasters/public
  safety, privacy/minors, abuse, illegal/explicit content, harmful rumors, and contextual
  risk. News has a separate restrained editorial policy.
- **Automation:** two local Kimi Code session cron tasks submit only exact
  same-repository, one-file daily candidate PRs; a Friday task renews the local schedule.
  The Mac/session must remain available and no second scheduler may run in parallel.
  Trusted base-code jobs own timestamps, validation, local commits, and rebases; a final
  token-scoped step owns the push and correlated deploy. Repository ruleset
  `codex-trusted-main` prevents the operator or ordinary users from updating/merging
  main and permits only the dedicated trusted publisher deploy key to bypass.

## Module Map
- `src/app/`: Next.js routes, metadata, global/responsive styles, and static composition.
  Depends on `src/features/` and `src/domain/`.
- `src/features/home/`: dual-feed tabs, component-based heat/freshness sorting, status,
  news cards, and home composition.
- `src/features/memes/`: meme cards, archives, detail helpers, and list behavior. Depends
  on `src/domain/memedaily/`.
- `src/domain/memedaily/`: meme schema, loaders, evidence/safety/lifecycle gates, and
  deterministic history calculations. It has no UI or infrastructure dependency.
- `src/domain/dailynews/`: news schema, loaders, labels, freshness, editorial gates, and
  deterministic history calculations. `README.md` indexes the module;
  `editorial-policy.ts` owns v3 composition/selection reconciliation. It has no UI
  or infrastructure dependency.
- `scripts/`: validation, fail-closed minimum-output guards, trusted publish-time
  stamping, public hot-list prefetching, font generation, and governance checks.
- `.github/workflows/`: CI, Pages, trusted Codex candidate ingestion, manual
  fallback/monitor recovery, and cloud-fetch diagnostics. Official actions are pinned
  to commit SHAs.
- `data/daily/` and `data/daily-news/`: product content sources of truth.
- `public/`: same-origin fonts, PWA manifest/icons/service worker, domain token, and CNAME.
- `ai/`: operational prompts and one-file-per-session handoffs.
- `docs/project/`: historical design export; excluded from production lint semantics.

## Dependency Rules
- Routes compose features; features call domain; domain stays pure and data-oriented.
- UI must not import automation scripts.
- Domain must not import Next.js, React, route components, or workflows.
- Scripts may use domain contracts but must not import UI.
- `scripts/checks/check-import-boundaries.sh` enforces the declared paths.

## Data And Publication Contracts
- **Meme envelope:** `data/daily/YYYY-MM-DD.json`
- **News envelope:** `data/daily-news/YYYY-MM-DD.json`
- **Evidence tiers:** `platform_public`, `aggregator`, `search_media`, `spillover`
- **Meme publication minimum:** two independent HTTP(S) URLs with at least one
  `platform_public` or `aggregator` source, plus a reusable meme shell and all safety gates.
- **Daily output minimum (effective 2026-07-26):** each feed independently requires
  `published`/`partial` plus at least three evidence-qualified, reader-visible items.
  Heat, freshness, and editorial confidence may be relaxed through the documented
  recovery pool; safety, truth, chronology, and source gates may not.
- **Archive continuity (effective 2026-07-26):** each feed independently has one file for
  every date from the cutoff through its own maximum committed date. Validation does not
  require today and never borrows the other feed's maximum, preserving the staggered daily
  schedule while blocking silent internal gaps.
- **Meme dynamic selection (effective 2026-07-27):** at least 30 new and recurring
  candidates compete on current heat, freshness, demonstrated reusability, and evidence.
  There is no fixed cross-day quota. Recurrence requires stable identity/list count and
  non-origin observed activity after the previous selection clock (historical evaluation
  clock when present, otherwise trusted publication); origin or page capture
  time alone is not renewed-activity evidence. Finalist identity is resolved across all
  history (including held), canonical text is display-anchored, and a complete candidate
  ledger derives the strictest sufficient tier, Top-N/capacity, and every report count.
  Safety-drop ledger rows are opaque and content-free.
- **Editorial completion (effective 2026-08-01):** three is the availability floor,
  not a selection target. Both feeds publish every permitted chosen-tier qualifier up
  to 10, declare completion only after reconciled research/audit accounting, and perform
  a second pass to at least 45 candidates when exactly three qualify.
- **News domestic-majority policy:** v3 requires domestic scope `>=ceil(0.75*N)` and
  international scope `<=floor(0.25*N)`, with no international minimum. Routine local
  news from any foreign country is excluded absent direct China-reader impact or global
  representative significance; international authority alone is not heat evidence.
  Qualification uses the later of score/event-age tiers, everyday relevance `>=15/25`,
  stable story identity, and a real `occurred_at`. Canonical evidence URLs remove
  fragments/tracking parameters but retain meaningful query identifiers.
- **Trusted chronology:** publication jobs set real `generated_at` and `published_at`;
  sources cannot claim capture after publication. An authorized missing-date backfill uses
  `selection.evaluated_at` for target-day score/activity windows while preserving the real
  later publication clock; that evaluation time must fall on the envelope date and precede
  both trusted clocks.
- **News attribution:** every reader-visible DailyNews source has a required `outlet` label.
- **Runtime:** static files only; there is no backend API.

## Automation Map
- Eight ChatGPT Work Web Scheduled Tasks: news runs at 06:00, hourly 07:15–12:15,
  14:45, and 21:30; memes run at 07:00, hourly 08:00–13:00, 14:30, and 21:20, all
  in Asia/Shanghai. Durable behavior lives in `ai/prompts/CODEX_CLOUD_RUNBOOK.md`; the
  exact persistent Instructions template lives in `ai/prompts/CODEX_CLOUD_TASK_INSTRUCTIONS.md`.
- Fixed retries always start with one inexpensive live-main completion preflight. Only a
  current-policy `published`/`partial` envelope with 3–10 visible qualified items,
  `selection.editorial_complete:true`, and a reconciled domain contract is
  terminal and stops before research, writes, branches, or PRs. The eight former Codex
  Desktop heartbeats were deleted; a local automation pointing at a Cloud context must
  never be described as a server schedule.
- Meme authoring applies ADR-009/010's score/activity tiers without a fixed cross-day
  count. News applies ADR-010's score tiers, domestic ratio, and international gate.
  Monitors alert on legacy-policy/incomplete data as well as under-minimum data, and
  independently alert when no successful Pages deployment covers live main so a
  content incident cannot hide a stale production build.
- `codex-daily-pr-publish.yml`: same-repository exact-branch/one-JSON candidate
  ingestion, explicit current-policy completion gate, serialized current-day
  new/under-minimum or one-time policy-migration publication, create-only missing-date
  backfill from 2026-07-26 through today, and correlated Pages wait. Every existing
  historical day remains immutable.
- `daily-{news-}fallback.yml`: manual-only fail-closed recovery guards; the server
  fallback tasks perform the editorial research.
- `daily-{news-}monitor.yml`: manual-only policy/completion/live-main/Pages verification.
- `pages.yml`: run the canonical release gate, build, and deploy the static export
  after trusted changes.
- `ci.yml`: source, data, governance, secret, production dependency audit, type, test,
  and build gates. The same production audit is part of `npm run check`, so every
  trusted writer fails before pushing a tree that Pages cannot accept.

## Reading Path
- **Bug fix:** `.cloud.md` -> target module README -> target and adjacent files.
- **Feature:** add the active plan and relevant spec.
- **Architecture/automation:** add this map, ADRs, workflows, and operational prompts.
- **Audit handoff:** add `docs/40-audits/` and the active session log.
