# MemeDaily / 热梗日报

A Chinese-internet daily desk for content, marketing, and communications teams. It publishes
a daily static site built from publicly accessible web evidence, with conservative safety
gates and permanent archives. The site has **two feeds**, switchable via the home tabs:

- **热梗 (memes)** — genuinely spreading, reusable 网络流行语 / 语言梗 (curated for content &
  advertising value). Data: `data/daily/YYYY-MM-DD.json`.
- **日报 (news)** — 3–10 heat-ranked 民生 news items a day (close to everyday life,
  restrained news tone). Data: `data/daily-news/YYYY-MM-DD.json`.

## Current Architecture

- **Collaboration OS:** this repo uses the Ai-Workflow-Kit governance layer. Read
  `AGENTS.md` first, then `.cloud.md`, then the active plan.
- **App layer:** a static web product (Next.js static export) published with GitHub Pages.
  One JSON file per day per feed under `data/daily/` (memes) and `data/daily-news/` (news).
- **Automation model:** two Kimi Code session cron tasks own unattended primary
  triggers (news 06:00; memes 07:00, Asia/Shanghai), with a weekly scheduler renewal.
  The owner's Mac and session must remain available; no second scheduler may run in
  parallel. Each operator can write only one exact dated JSON on a same-repository
  `codex/daily-{meme|news}-YYYY-MM-DD` branch and opens a PR; it never writes or
  merges `main`, changes rulesets, or uses administrator merges.
  `codex-daily-pr-publish.yml` reads only that JSON blob in a read-only job, stamps
  and validates it with trusted `main` code, then a separate trusted job revalidates
  the final tree, exposes the dedicated deploy key only to its final push step, and
  waits for the correlated Pages deployment to succeed. The active
  `codex-trusted-main` ruleset blocks ordinary users/connected apps from updating or
  merging `main`; only one dedicated write deploy key, injected into the trusted
  final workflow step, can bypass for publication. GitHub `schedule:`, external
  cron-job.org, and the Anthropic publisher remain retired. GitHub Actions is
  event-driven for validation, CI, and deployment; manual fallback/monitor workflows
  remain for disaster recovery. See `ai/prompts/CODEX_CLOUD_RUNBOOK.md`,
  `ai/prompts/CODEX_CLOUD_TASK_INSTRUCTIONS.md`, and ADR-007/ADR-008. From
  2026-07-26 onward, only `published`/`partial` with at least three evidence-qualified
  visible items per feed is terminal; `held` remains an operator-only emergency
  takedown.
- **Client freshness:** an inline boot script in `layout.tsx` `<head>` (chunk-independent,
  runs even if hashed JS 404s) self-heals an unstyled render and registers a hand-written
  **network-first** service worker (`public/sw.js`: browser-cache bypass for HTML, offline
  fallback, immutable hashed assets cached). GitHub Pages may still retain HTML at its edge
  for its hosting TTL. The app CSS is **inlined** into each page's `<head>`
  (`experimental.inlineCss`), so it ships with the HTML and can't independently fail to load.
  `sw.js` **derives** its scope/prefixes from `self.registration.scope`, so a domain
  detach/re-attach (a `basePath` change) needs NO `sw.js` edit.
- **Collection policy:** public web intelligence only. No login cookies, no private platform
  scraping, no media archiving, no comment-text dumps. No paid model API in the product itself.

## Important Paths

| Path | Purpose |
| --- | --- |
| `.cloud.md` | Current project state and next actions (SSOT — read first) |
| `AGENTS.md` | Cross-model canon (reading order, rules, tool adaptation) |
| `ai/prompts/CODEX_CLOUD_RUNBOOK.md` | Codex Cloud trigger, idempotency, candidate-PR, and fallback contract |
| `ai/prompts/CODEX_FULL_HANDOFF.md` | Self-contained prompt for Codex to take over both feeds |
| `ai/prompts/MEMEDAILY_DAILY_AUTOMATION.md` / `DAILYNEWS_DAILY_AUTOMATION.md` | Living per-feed rules |
| `src/domain/{memedaily,dailynews}/schema.ts` | Zod data contracts |
| `docs/00-context/PROJECT_MAP.md` | Module map, constraints, reading path |
| `docs/30-decisions/` | Architecture decision records |
| `docs/40-audits/` | Dated engineering audits and installed-Skills inventories |
| `scripts/stamp-publish-time.ts` | Trusted post-candidate publication timestamp normalization |
| `.github/workflows/` | CI + trusted candidate ingestion + Pages + manual fallback/monitor recovery |
| `产品方案.md` | Original Chinese product plan (historical; current overrides are marked at its top) |

## Local Workflow

```bash
git config core.hooksPath .githooks
npm install
npm run check   # validate + validate:news + lint + typecheck + test + build
```

To validate an agent-produced day file in a trusted local recovery run, stamp it before
the full check:

```bash
npm run stamp:publish -- data/daily/YYYY-MM-DD.json
npm run check
```

## Publishing Target

The site is **live at `https://memedaily.fun`** (custom domain re-attached 2026-06-29 after
ICP 备案 approval; `next.config.mjs` basePath `""`). To detach again if ever needed, flip
basePath to `"/MemeDaily"`, point `layout.tsx` metadata back at the github.io origin, remove
`public/CNAME`, and disable the DNS records — `sw.js` self-derives, so it needs no edit (see
the re-attach runbook in `.cloud.md`). On GitHub Free the repository must remain public for
Pages. Do not store secrets, private company information, media assets, platform cookies, or
unpublished source material in this repo.
