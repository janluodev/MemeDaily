# Current Iteration

## Iteration Goal

On 2026-08-21, restore every missing MemeDaily and DailyNews archive caused by the
publishing interruption. First add a create-only historical path to the trusted one-file
publisher and separate target-day editorial evaluation from truthful current publication;
then submit, deploy, and verify every absent feed/date without overwriting existing archives.
Add a feed-local continuity gate so any future internal date omission fails CI once a later
date exists, without requiring either feed to publish through today or align its maximum
with the other feed.

On 2026-08-10, restore the production site after three days of Pages failures,
make the production dependency audit part of every trusted pre-push release gate,
and separate deployment freshness alerts from content-contract incidents. Reconcile
the latest dual-feed `main` data with a successful Pages deployment and production
readback, then clean up the candidate PRs left open by the failed deploy waits.

On 2026-08-01, correct the newly observed minimum-count anchoring without weakening the
three-item availability floor. Require both feeds to finish a bounded, auditable
candidate search and publish every qualifying item up to ten. Restore DailyNews to a
China-centered everyday-life mix with at least 75% domestic scope and at most 25%
representative international coverage. Synchronize all eight persistent Cloud prompts
and prove the corrected rules with a real same-day trusted publication and production
readback.

Historical takeover scope and completed acceptance evidence remain below.

Align local, GitHub `main`, and production; repair confirmed reliability/security/data
defects; then replace the stopped Anthropic publisher with fully cloud-hosted Codex
primary, catch-up, monitor, and fallback schedules for both feeds. Correct the
2026-07-26 local-heartbeat deployment error, backfill both feeds, and prove that the
server scheduler and trusted publication path operate without the owner's Mac. Replace
the initial meme `skipped/0` result with a hard per-feed minimum of three safe,
evidence-qualified items and prove the trusted under-minimum repair path. Correct the
subsequent all-prior-day meme board, then replace calendar-based carry-over with an
auditable heat/freshness score that deliberately has no fixed cross-day quota.

## Scope

- **In:** repository/production reconciliation, dependency and CI/Pages security,
  create-only historical publication, evaluation/publication clock separation, full
  missing-date inventory and backfill, feed-local archive continuity validation,
  trusted candidate ingestion, publish/deploy correlation, fallback/monitor
  reliability, public data minimization, metadata, cloud prompts, all eight cloud
  schedules, retirement of all eight local heartbeats, 2026-07-26 dual-feed recovery,
  minimum-three recovery policy and monotonic repair, documentation/state/session
  synchronization, 2026-07-26 editorial correction, dynamic meme selection,
  server-task prompt synchronization, and production acceptance.
- **Out:** unrelated visual redesign, historical audit rewrites, private-platform
  extraction, paid model APIs in the product, and unrelated credential/account changes.

## Checklist

### 2026-08-21 full historical backfill

- [x] Inventory every feed/date from 2026-07-26 through 2026-08-21 and identify four
  missing meme envelopes plus six missing news envelopes.
- [x] Accept exact historical candidate branches only within 2026-07-26..Shanghai-today.
- [x] Require the target to be absent from `main` in both publisher jobs; preserve the
  same-repository, non-draft, one-file, full-check, and final-step DeployKey boundary.
- [x] Add optional `selection.evaluated_at`, use it for meme/news qualification and
  historical recurrence ordering, and keep real current trusted publication timestamps.
- [x] Pass focused chronology/security regressions, full `npm run check`, governance,
  workflow Bash/YAML parsing, and independent review.
- [x] Add one shared 2026-07-26 continuity rule to both validators, bounded by each
  feed's own latest file, with gap/cutoff/continuous/independence unit coverage.
- [x] Rebase the continuity gate onto the completed backfill and pass the canonical
  release/governance checks with no archive gaps.
- [x] Merge the support release and reverify active DeployKey-only branch protection.
- [x] Publish the ten exact missing feed/date candidates and correlate each accepted main
  commit with successful Pages deployment.
- [x] Verify production archive/detail surfaces and close all candidate/incident records.

### 2026-08-10 deployment recovery

- [x] Reproduce the stale production site and prove the eight server tasks continued
  creating daily candidates.
- [x] Isolate the shared CI/Pages blocker to the newly disclosed high-severity
  `nanoid <3.3.17` advisory and refresh the lock to a fixed transitive release.
- [x] Put the production audit inside the canonical `npm run check` path used by every
  trusted writer before protected-main push.
- [x] Make both deterministic and Cloud monitors check Pages freshness independently
  from feed editorial validity, with regression coverage.
- [x] Merge the repair under the protected-main maintenance procedure, restore the
  DeployKey-only ruleset, and pass main CI plus Pages.
- [x] Verify cache-bypassed production exposes the latest heat-meme and DailyNews data,
  then resolve stale candidate PRs and deployment alerts.
- [x] Confirm from dated candidates and trusted-publisher runs that the server tasks
  continued throughout the outage, keep all schedules unchanged, and publish the live
  monitor/runbook correction that every task rereads. No task edit was required for
  this repository-side Pages failure.

### 2026-08-01 editorial-completeness correction

- [x] Fast-forward local `main` to current GitHub `main` and preserve a clean baseline.
- [x] Add backward-compatible editorial-completeness and research-pass contracts to both feeds.
- [x] Require a second pass and at least 45 candidates before an exact-three result is terminal.
- [x] Add independent DailyNews geography/topic fields, domestic/international ratio gates,
  representative international evidence, and auditable Top-N selection.
- [x] Add a one-time trusted migration from today's legacy policy envelopes to the new policy.
- [x] Update the handoff, Cloud runbook, living prompts, project map, ADR, and session state.
- [x] Update and read back all eight server Scheduled Task prompts without schedule changes.
- [x] Pass focused tests, `npm run check`, governance checks, and independent review.
- [x] Merge the rule release while preserving the active DeployKey-only main ruleset.
- [x] Make the legacy-policy fallback regression self-contained so today's successful
  policy migration cannot invalidate the trusted publisher's full test run.
- [x] Rerun both 2026-08-01 feeds through exact one-file candidates and verify main, Pages,
  production content, counts, mix, and later-task no-op behavior.

- [x] Fast-forward local `main` and prove local HEAD, remote `main`, latest Pages
  deployment, and production baseline agree.
- [x] Upgrade vulnerable production dependencies, pin Node/npm runtime expectations,
  add production high-severity audit gates, and downscope Pages permissions.
- [x] Harden fallback paths, live-tip dedup, Pages dispatch retries/correlation,
  empty-news validation, fallback date containment, and regression tests.
- [x] Minimize reader-facing meme payloads and restore canonical detail metadata.
- [x] Remove the stopped Anthropic publishers and repository/external cron ownership.
- [x] Add the same-repository, exact-branch, one-JSON Codex candidate workflow with
  trusted stamping/check/rebase/push/Pages boundaries.
- [x] Add ADR-007 and durable Codex Cloud primary/catch-up/monitor/fallback runbooks.
- [x] Activate and API-verify deploy-key-only `codex-trusted-main` plus its sole
  writable key (end-to-end push proof remains in the candidate acceptance item).
- [x] Diagnose the 2026-07-26 outage as eight local Codex Desktop heartbeats that
  pointed at Cloud contexts but were not server-hosted schedules.
- [x] Delete all eight local heartbeats and create/read back eight genuine ChatGPT
  Work Web Scheduled Tasks with the exact Asia/Shanghai cadence.
- [x] Backfill the 2026-07-26 meme and news envelopes through one-file candidate PRs
  #40 and #41 and the trusted DeployKey publisher.
- [x] Correlate both accepted main commits with successful CI and Pages runs and verify
  cache-bypassed production HTTP 200 with current dual-feed content.
- [x] Observe the real 12:00 meme and 12:15 news Web Scheduled catch-up runs; prove
  both terminal live-main preflights caused no-ops with no additional GitHub mutation.
- [x] Deploy the explicit candidate `>=3` gate and trusted exact-file
  under-minimum-to-complete repair path.
- [x] Replace the 2026-07-26 meme `skipped/0` envelope through the exact daily
  candidate PR and correlated Pages deployment. This restored availability but
  produced an editorial quality incident because all three items repeated 2026-07-25.
- [x] Correct that board through data-only PR #48 with four independently researched
  items, including one genuinely renewed cross-day phrase selected for current heat
  rather than for quota filling; verify main CI, Pages, and production.
- [x] Add distinct semantic leading emoji to all four corrected titles through
  data-only PR #49; verify main CI, Pages, ruleset restoration, and production.
- [x] Define ADR-009 and implement a 30-candidate, 100-point dynamic meme gate with
  `strict_24h` / `relaxed_48h` / `relaxed_72h`, activity timestamps, stable recurrence
  identity, an auditable candidate/capacity ledger, and no fixed cross-day maximum.
- [x] Pass full local/governance validation and independent review for the dynamic gate.
- [x] Merge the dynamic policy, update the server Scheduled Task prompts without
  changing their schedules, and read back all eight persistent task definitions.
- [x] Update and read back all eight server Scheduled Task prompts so terminal no-op
  requires the exact current policy, editorial completion, three-to-ten valid items,
  and fallback performs editorial recovery.
- [x] Activate the domain/monitor/fallback gates, complete full verification, and prove
  local, GitHub main, Pages, and production agree.
- [x] Run the complete local/governance/security suite and independent diff review;
  correct its final Pages-budget and documentation findings.
- [x] Merge the final correction, pass main CI/Pages, restore protection, and verify
  production.
- [x] Exercise a formal Cloud fallback run and verify terminal-day idempotent no-op.
- [x] Retire the unreferenced Anthropic OAuth secret.
- [x] Sync `.cloud.md`, session log/index, and final operational evidence.

### 2026-10-24 repository migration and GitHub-policy alignment

- [x] Reconcile all three local clones with `janluodev/MemeDaily` and recover the full
  archive through news 2026-10-24 and memes 2026-10-24.
- [x] Confirm the old publisher private key is unavailable; create a new ED25519 write
  deploy key and install only its private half as `CODEX_PUBLISH_DEPLOY_KEY`.
- [x] Verify workflow-based Pages, the approved custom-domain certificate, production
  HTTP 200, and the existing GitHub Pages A/AAAA, `www` CNAME, and verification TXT
  records through the authorized Aliyun `default` profile. No DNS change was needed.
- [x] Publish the preserved 2026-10-24 meme candidate through PR #1 and the trusted
  workflow; correlate main `ffd7b567bc0a4bc22724fbf12ac0fb84c2eba9cb`, successful
  Pages run `40089755720`, and all four titles on production.
- [x] Replace the stale eight-cloud-task operating model with two local Kimi primary
  cron tasks and one Friday renewal; document the Mac/session availability boundary.
- [x] Read the current GitHub Terms, AUP, Community Guidelines, Actions terms/limits,
  Pages terms/limits, REST rate limits, and appeal process. Prohibit administrator
  merges, programmatic ruleset changes, token sharing, parallel schedulers, duplicate
  candidates, and account creation to evade enforcement.
- [x] Scope ordinary CI to main/PRs, skip exact daily candidates already covered by the
  trusted publisher, and skip redundant CI for data-only main publishes while retaining
  the independent Pages canonical gate.
- [x] Prepare this configuration for normal merge without administrator bypass, with
  an immediate post-merge DeployKey-only ruleset restoration/readback step and full
  verification; no automated protection disable/restore cycle is part of the procedure.

## High-Risk Areas

- Public-web prompt injection must not reach commands, trusted code, or a production
  token; the operator is a candidate producer, never a main publisher.
- `pull_request_target` must never check out or execute the candidate tree.
- All automatic main writers must share one concurrency group and verify the live tip
  before creating data.
- A git push is not production success; the publisher must wait for a Pages run covering
  the accepted commit (or descendant).
- Local schedules require the Mac and long-lived Kimi session to remain available;
  weekly renewal must recreate all three tasks without leaving duplicates.
- The connected operator must be mechanically unable to update or merge main. Account
  standing cannot be guaranteed by workflow design; the old suspension needs official
  appeal/clarification and no further replacement accounts.

## Acceptance Standard

- `npm run check`, production dependency audit, strict governance gates, action-pin and
  workflow-security tests, YAML/shell parsing, and diff checks pass.
- Exactly two daily Kimi cron tasks and one weekly renewal exist with the documented
  Asia/Shanghai cadence; no second scheduler is enabled by this configuration.
- The active main ruleset exposes only `DeployKey` as an update bypass, the repository
  has one writable trusted publisher key, and a real trusted candidate proves that path.
- Duplicate behavior is a no-op only after a live envelope uses the exact current
  policy, is editorially complete, has three to ten evidence-qualified visible items
  with matching counts, and passes the complete feed contract.
- Local checkout, GitHub `main`, latest successful Pages deployment, and
  `https://memedaily.fun` agree on the accepted commit/content.
- Meme selection does not optimize for a calendar quota. Any number of recurring items
  may rank when each has qualifying score and activity after its previous site
  publication; stale recapture is mechanically rejected.

## Last Updated

- 2026-10-24
