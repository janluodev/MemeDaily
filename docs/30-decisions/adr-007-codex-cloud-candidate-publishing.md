# ADR-007: Codex Cloud Submits One-File Candidates to a Trusted Publisher

## Status

Accepted, superseding ADR-006's Anthropic/GitHub-Actions model-facing job while
preserving its trust separation. The scheduler implementation was corrected on
2026-07-26 after local Desktop heartbeats were mistaken for server-hosted tasks.

## Context

The Anthropic subscription publisher stopped running, and the product needs an
unattended operator that does not depend on the owner's Mac. ChatGPT Work / Codex
Cloud Scheduled tasks can browse public sources and use the connected GitHub tool,
but web tasks do not retain a local repository folder or worktree.

The first implementation created eight Codex Desktop `heartbeat` automations that
pointed at Cloud task contexts. That proved the target contexts could read GitHub, but
did not move scheduling off the owner's Mac. On 2026-07-26 none of the expected morning
runs reached GitHub. The local heartbeats were deleted and replaced with genuine
ChatGPT Work Web Scheduled Tasks.

Public pages are attacker-influenceable. A cloud task that both researches them and
can publish `main` would collapse the untrusted research and trusted release
boundaries established by ADR-006. GitHub scheduled events and the prior external
cron also proved too easy to drop or drift independently.

## Decision

Keep untrusted research outside the trusted release boundary and keep final
publication inside the repository:

1. Protect `refs/heads/main` with the active repository ruleset
   `codex-trusted-main`: the branch cannot be updated by ordinary users or connected
   apps; only repository write deploy keys may bypass. The repository has one such key,
   `MemeDaily trusted publisher`; its private half exists only as the Actions secret
   `CODEX_PUBLISH_DEPLOY_KEY` and is exposed only to final trusted push steps. This also
   prevents an operator from merging its own candidate PR. Code maintenance is outside
   unattended automation and must not trigger scripted protection disable/restore cycles.
2. The current scheduler is two local Kimi Code session cron tasks: news at 06:00 and
   memes at 07:00, Asia/Shanghai. A Friday 18:17 task renews all three local schedules.
   The owner's Mac/session must remain available. The former eight ChatGPT Work tasks
   are legacy and no second scheduler may run in parallel.
3. Every run rereads `ai/prompts/CODEX_CLOUD_RUNBOOK.md`, the current living
   per-feed rules, schema, and recent envelopes required by that runbook.
4. A content/fallback run may create or update only one same-repository branch:
   `codex/daily-meme-YYYY-MM-DD` or `codex/daily-news-YYYY-MM-DD`. It writes only
   that feed/date JSON and opens one PR. It never merges or targets another path.
5. `.github/workflows/codex-daily-pr-publish.yml` uses
   `pull_request_target`, but never checks out or executes the PR tree. Its
   read-only job requires a same-repository exact branch, confirms the PR changes
   exactly the expected JSON, fetches only that blob through the GitHub API,
   applies the trusted clock, and runs the full repository checks.
6. A separate trusted job downloads only the accepted JSON, resets to current
   `main`, refuses to replace any existing live envelope, stamps and revalidates,
   rebases and revalidates again, then receives a write token only for the final
   push. It first adopts the Pages run emitted by that deploy-key push; if no such
   run appears or it fails, it dispatches one bounded recovery run. It waits for a
   run covering the accepted SHA (or descendant) to succeed before closing the
   candidate PR.
7. GitHub `schedule:` and external cron-job.org triggers remain retired. The
   deterministic fallback and monitor workflows remain `workflow_dispatch`-only
   recovery tools. Ordinary CI skips exact daily candidates and data-only main
   publishes; Pages still runs the canonical gate for every main commit.
8. Every primary starts with one inexpensive live-main preflight. If the current
   feed/date already has a valid terminal envelope, the task stops before research,
   file writes, branch creation, or PR creation. There are no fixed hourly catch-up
   invocations and no tight polling/retry loops.

## Security Properties

- Web content cannot change commands, validators, workflows, or the trusted
  checkout through the accepted artifact path.
- A fork cannot enter the trusted publisher; the PR head repository must equal the
  base repository.
- An arbitrary same-repository branch/path cannot enter; branch, date, file count,
  target path, and envelope date must all match.
- A connected Cloud GitHub app cannot update or merge `main`; the repository ruleset
  permits only the dedicated deploy key to perform the final branch update.
- The candidate job has read-only contents/PR permissions and no repository write
  token. The trusted publish job never executes candidate-controlled code.
- The normal `GITHUB_TOKEN` is read-only for contents; it can inspect/dispatch Actions
  and close the accepted PR, but cannot update protected main. Only the final step
  receives `CODEX_PUBLISH_DEPLOY_KEY`.
- Existing live-main envelopes are terminal, so primary, catch-up, and fallback
  races become no-ops after one inexpensive live-main preflight.
- All final writers share `daily-data-publish` concurrency and fail closed on
  live-main fetch, validation, non-fast-forward push, or Pages failure.

The connected GitHub tool still has account-level branch/PR permissions. Exact-path
behavior is an operator contract; the active main ruleset plus trusted workflow form
the mechanical production boundary. Review connector permissions and the first
scheduled runs as defense in depth.

## Alternatives Considered

- **Let an operator push or merge `main`:** rejected; it combines untrusted web input
  with production credentials.
- **Require every schedule to be cloud-hosted:** rejected for the current migration;
  the owner explicitly accepts the Mac/session dependency in exchange for one simple,
  inspectable local scheduler. Any future cloud cutover must disable, not supplement,
  the local schedule.
- **Keep a second scheduler as backup:** rejected because concurrent owners create
  duplicate research, candidates, API calls, and publication races. Manual recovery is
  sufficient while a terminal archive remains online.
- **Trust a PR merge after ordinary CI:** rejected; the dedicated ingest workflow
  must extract only data and use trusted base code before any publication token.

## Consequences

- Positive: exactly two daily triggers and one weekly renewal have a single auditable
  owner; terminal no-ops and exact-branch dedup avoid unnecessary work.
- Positive: main publication stays deterministic and audited, and successful
  publication includes production deployment evidence rather than merely a git push
  or opened PR.
- Positive: prompt injection cannot turn the operator into a direct-main or self-merge
  path. Avoiding duplicate ordinary CI reduces compute without weakening trusted or
  Pages validation.
- Negative: the owner's Mac and long-lived session are availability dependencies;
  missed fire times and the bounded cron lifetime require monitoring and weekly renewal.
- Negative: the candidate PR adds latency and leaves failed runs visible for diagnosis.
  Legacy external task status remains a manual migration check.
- Negative: code maintenance is separate from unattended content publication. It must
  not cause automated ruleset changes or administrator merges.

## Verification

- `scripts/workflow-security.test.ts` asserts the same-repository, exact-branch,
  one-file, trusted-checkout, SHA-pin, token-order, no-GitHub-cron, and duplicate-CI
  avoidance contracts.
- `scripts/publish-reliability.test.ts` covers bounded dispatch retries, correlated
  Pages success, shared writer concurrency, live-tip fallback, and deployment alerts.
- CI runs production high-severity dependency audit plus the canonical full check;
  Pages repeats the production audit and full check before deployment.
- Operational acceptance requires exactly two daily Kimi tasks plus one Friday renewal,
  a real trusted candidate publication, and agreement among live `main`, Pages, and
  `https://memedaily.fun`. Migration PR #1 published four 2026-10-24 memes through
  trusted run `40089580950` and Pages run `40089755720`.
- `GET /repos/janluodev/MemeDaily/rulesets` plus the selected ruleset detail must show
  enforcement `active`, `refs/heads/main`, an `update` rule, and the sole bypass type
  `DeployKey`. Repository deploy keys must contain exactly one writable key titled
  `MemeDaily trusted publisher`; the private half is only the Actions secret after the
  verified local copy is removed.
- 2026-07-26 recovery provided two real publication paths: meme PR #40 produced a
  zero-item `skipped` envelope, trusted run `30186891155` accepted main `6583aec`,
  and CI `30186948953` plus Pages `30186948929` succeeded; news PR #41 produced six
  published items, trusted run `30186938154` accepted final main `90aa02c`, and CI
  `30187028830` plus Pages `30187028839` succeeded.
- The 12:00 meme Web Scheduled catch-up reported `Last ran 12:02`, observed the
  terminal `skipped` envelope on live main, and stopped without another GitHub
  mutation. The 12:15 news catch-up ran at 12:14, observed the terminal `published`
  envelope with six items, and did the same. A cache-bypassed production request
  returned HTTP 200 with `Last-Modified: Sun, 26 Jul 2026 04:00:00 GMT`.

## 2026-07-26 Amendment: Minimum-Three Terminal State

ADR-008 narrows this ADR's idempotency and existing-envelope rules from
2026-07-26 onward. Where the original text treats every existing or
`published` / `partial` / `skipped` / `held` envelope as terminal, the amended
contract is:

- only `published` or `partial` with at least three published items and matching
  `run_report.published` is terminal;
- `skipped` or fewer-than-three output is an under-minimum state, so primary,
  catch-up, and fallback tasks must continue recovery; `held` remains an
  operator-controlled safety incident that automation never clears;
- the trusted publisher may replace that one existing feed/date JSON only with a
  same-date, exact-path candidate that raises it to the compliant minimum; it still
  preserves any already-visible item unchanged and rejects arbitrary rewrites,
  compliant-to-compliant replacement, and downgrade;
- editorial recovery may lower freshness, heat, novelty, or confidence and may use
  freshly revalidated safe carry-over candidates, but may not lower hard safety,
  truthfulness, schema, chronology, or public-evidence requirements.

This is a monotonic repair exception, not a general right to overwrite live data.
Once live `main` reaches the minimum, all later scheduled invocations return to the
inexpensive preflight no-op behavior.

Recovery PR #40 remains immutable historical evidence that the earlier contract
accepted a zero-item `skipped` meme envelope. The new policy repairs the current
`data/daily/2026-07-26.json` through a later audited exact-file change; it does not
amend, force-push, or conceal PR #40 or its commits.

## 2026-08-10 Amendment: Release-Audit Parity and Independent Deploy Health

On 2026-08-07 a newly published high-severity advisory made the locked production
dependency tree fail `npm audit --omit=dev --audit-level=high`. CI and Pages enforced
that gate, but the trusted candidate publisher only ran `npm run check`. It therefore
advanced `main` before Pages rejected the same tree, leaving valid later daily data in
git while production remained on the last deployable commit.

The release boundary is amended as follows:

- `npm run check` includes the production high-severity audit, so candidate validation,
  live-tip preparation, post-rebase validation, manual fallback writers, CI, and Pages
  all evaluate the same dependency-security contract before any protected-main push;
- the lockfile is refreshed to a non-vulnerable transitive version rather than weakening
  or bypassing the advisory gate;
- monitor tasks and deterministic monitor workflows treat content validity and deploy
  freshness as independent health axes. They check whether a successful Pages run covers
  live `main` even when the feed also has a content incident, and maintain a separate
  deployment alert until production is current.

This preserves fail-closed security while preventing a known-undeployable tree from
entering `main` through a trusted writer and preventing editorial alerts from masking a
stale public site.

## 2026-10-24 Amendment: Local Kimi Scheduling and GitHub-Policy Alignment

This amendment supersedes the scheduler-specific eight-task text, the rejection of a
local operator, and the temporary-ruleset-maintenance instructions above. The one-file
candidate and trusted-publisher security boundary remains unchanged.

- The active scheduler is exactly two local Kimi Code session cron tasks: news at
  06:00 and memes at 07:00, Asia/Shanghai. A Friday 18:17 task recreates all three
  local schedules before expiry. `ai/prompts/CODEX_CLOUD_TASK_INSTRUCTIONS.md` is the
  operative prompt and renewal contract. The owner's Mac/session must remain available;
  no legacy or additional scheduler may run in parallel.
- GitHub Actions has no `schedule:` trigger. Ordinary CI runs for main and ordinary PRs,
  but skips exact daily candidates already checked by the trusted publisher and skips
  redundant data-only main publishes. Pages still runs the canonical gate on every main
  commit. Manual monitor/fallback workflows remain dispatch-only.
- Operators must not use administrator merges, programmatically alter rulesets or other
  security settings, create duplicate candidates, spin tight API retry loops, share
  tokens, or create accounts to evade limits/enforcement. Rate-limit responses require
  stopping and honoring `retry-after`/`x-ratelimit-reset`.
- Code maintenance is deliberately outside unattended content automation. It must not
  be used as a reason to script protection disable/restore cycles. Any exceptional
  owner maintenance is a separate, reviewed, human responsibility and does not relax
  the daily candidate boundary.
- The old account suspension has no verified public root cause. Prior Actions volume or
  ruleset/admin operations are only hypotheses. The applicable mitigations come from
  the official Terms of Service, Acceptable Use Policies, Additional Product Terms,
  Actions/Pages limits, and REST rate-limit documentation; none can guarantee account
  standing. Further replacement accounts are prohibited, and the official appeal and
  reinstatement process is the correct path for clarifying the old suspension.
- The current repository is `janluodev/MemeDaily`. Acceptance requires exactly one
  writable `MemeDaily trusted publisher` deploy key, the active DeployKey-only
  `codex-trusted-main` ruleset, a real trusted publication, correlated Pages success,
  production readback, and exactly three local cron tasks (two daily plus renewal).
