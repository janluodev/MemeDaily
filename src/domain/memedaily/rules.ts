/**
 * input: parsed MemeDaily envelopes and items
 * output: deterministic publication gate decisions
 * pos: domain policy layer for evidence thresholds and display status
 */
import type { DailyEnvelope, EvidenceTier, MemeItem } from "./schema";

const primaryEvidenceTiers: EvidenceTier[] = ["platform_public", "aggregator"];
const MINIMUM_DAILY_PUBLICATION_DATE = "2026-07-26";
const MINIMUM_VISIBLE_ITEMS = 3;

export function hasPublishableEvidence(item: MemeItem): boolean {
  const uniqueUrls = new Set(item.sources.map((source) => source.url));
  const hasPrimary = item.sources.some((source) =>
    primaryEvidenceTiers.includes(source.tier),
  );

  return uniqueUrls.size >= 2 && hasPrimary;
}

export function visibleItems(envelope: DailyEnvelope): MemeItem[] {
  if (envelope.status === "held" || envelope.status === "skipped") {
    return [];
  }

  return envelope.items.filter((item) => item.published && hasPublishableEvidence(item));
}

/**
 * Historical skipped/held envelopes remain readable, but the owner's minimum-output
 * contract applies to every new day from 2026-07-26 onward. Count only truly visible,
 * evidence-qualified items so hidden or weak filler can never satisfy the gate.
 */
export function minimumDailyPublicationIssues(envelope: DailyEnvelope): string[] {
  if (envelope.date < MINIMUM_DAILY_PUBLICATION_DATE) return [];

  const visibleCount = visibleItems(envelope).length;
  const publishableStatus = envelope.status === "published" || envelope.status === "partial";
  if (publishableStatus && visibleCount >= MINIMUM_VISIBLE_ITEMS) return [];

  return [
    `${envelope.date} requires status published/partial with at least ${MINIMUM_VISIBLE_ITEMS} visible items; got ${envelope.status} with ${visibleCount}`,
  ];
}

function normalizeName(value: string): string {
  return Array.from(value.toLowerCase())
    .filter((ch) => /[\p{L}\p{N}]/u.test(ch))
    .join("");
}

function itemNames(item: MemeItem): string[] {
  const names = [item.title, ...item.aliases].flatMap((value) => {
    const normalized = normalizeName(value);
    return normalized ? [normalized] : [];
  });
  return Array.from(new Set(names));
}

// Merge a recurring meme so it appears once: keep the FIRST occurrence (caller passes rows
// date-desc, so "first" = most recent). A recurrence carries the SAME id across days (its
// title may be reworded), so dedup by id first; also by normalized title/alias as a backstop.
// CAVEAT: unlike crossDayIssues (which only WARNS on a name collision), the name backstop here
// silently DROPS a row — two genuinely distinct memes sharing one normalized title/alias would
// lose one from the 梗库 archive. Accepted: id-first handles real recurrences and current data
// has no such collision; the name match is a rare-case backstop.
export function dedupeRecurring<T extends MemeItem>(rows: T[]): T[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const names = itemNames(row);
    if (seenIds.has(row.id) || names.some((name) => seenNames.has(name))) continue;
    seenIds.add(row.id);
    for (const name of names) seenNames.add(name);
    out.push(row);
  }
  return out;
}

// 「连续上榜天数」按 OUR OWN 榜确定性计算——不采信 agent 自填的 `days_on_list`（它反映的是全网热度
// 天数，不是我们的库；曾出现「首现即 4 天」的 bug：那是 6 月的「维京划船」在 7 月复现，被 agent 按全网
// 累计天数标成 4）。UI 文案是「连续 N 天上榜」，所以语义必须是「连续」：梗按标准化 title/alias 归并，
// 从展示当天沿【本站有发布的日期】往回数，直到它缺席的第一天为止。中断后复现 → 重新从「第 1 天」计。
// 这样既贴合「连续」文案，也让复现梗在「新鲜值」排序里回到高位（它确实是又火了一次）。
export function nameAppearanceDates(envelopes: DailyEnvelope[]): Map<string, string[]> {
  const byName = new Map<string, Set<string>>();
  for (const envelope of envelopes) {
    for (const item of visibleItems(envelope)) {
      for (const name of itemNames(item)) {
        let dates = byName.get(name);
        if (!dates) {
          dates = new Set<string>();
          byName.set(name, dates);
        }
        dates.add(envelope.date);
      }
    }
  }
  const sorted = new Map<string, string[]>();
  for (const [name, dates] of byName) sorted.set(name, [...dates].sort());
  return sorted;
}

// Dates on which the SITE published a non-empty board (has visible items), ascending. Days the
// site itself skipped/held don't count against a meme's streak — only days we actually published.
export function publishedDates(envelopes: DailyEnvelope[]): string[] {
  const dates = new Set<string>();
  for (const envelope of envelopes) {
    if (visibleItems(envelope).length > 0) dates.add(envelope.date);
  }
  return [...dates].sort();
}

export function boardStreakFor(
  item: MemeItem,
  onDate: string,
  nameDates: Map<string, string[]>,
  published: string[],
): number {
  const present = new Set<string>();
  for (const name of itemNames(item)) {
    for (const date of nameDates.get(name) ?? []) present.add(date);
  }
  // Walk published boards backwards from onDate; count consecutive presence, stop at first gap.
  let streak = 0;
  for (let i = published.length - 1; i >= 0; i--) {
    const date = published[i];
    if (date === undefined || date > onDate) continue; // ignore boards after the shown day
    if (!present.has(date)) break; // first absent published day ends the streak
    streak++;
  }
  return Math.max(1, streak); // the shown day always counts as day 1
}

const DECLINING_MIN_DAYS = 5;

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000);
}

/**
 * Lifecycle gate: a meme may be labeled `declining` (已过气) only once its topic has
 * been on the site for >= 5 days since its FIRST appearance in data/daily history.
 * Anything newer must be at least `rising`. First-seen is read from retained history;
 * a meme older than the retained window can't be disproven, so it is not flagged.
 */
export function lifecycleIssues(envelopes: DailyEnvelope[]): string[] {
  const issues: string[] = [];
  const byDateAsc = [...envelopes].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Map<string, string>();

  for (const envelope of byDateAsc) {
    for (const item of visibleItems(envelope)) {
      for (const name of itemNames(item)) {
        if (!firstDate.has(name)) firstDate.set(name, envelope.date);
      }
    }
  }

  for (const envelope of byDateAsc) {
    for (const item of visibleItems(envelope)) {
      if (item.lifecycle !== "declining") continue;
      let firstSeen: string | undefined;
      for (const name of itemNames(item)) {
        const seen = firstDate.get(name);
        if (seen && (!firstSeen || seen < firstSeen)) firstSeen = seen;
      }
      if (firstSeen && daysBetween(firstSeen, envelope.date) < DECLINING_MIN_DAYS) {
        issues.push(
          `${item.id} is 'declining' but its topic first appeared ${firstSeen} (<${DECLINING_MIN_DAYS} days before ${envelope.date}); use rising/peak`,
        );
      }
    }
  }

  return issues;
}

/**
 * Cross-day freshness gate: a meme that already appeared (by normalized
 * title/alias) on an earlier day must carry days_on_list >= 2, so the daily
 * agent cannot silently re-pitch a prior meme as brand new.
 *
 * Scope notes: only user-VISIBLE prior appearances seed the history, so a meme
 * previously held/skipped/unpublished (never shown) is intentionally not treated
 * as a re-pitch. Matching is by normalized title/alias, so two genuinely distinct
 * memes that share a short alias can collide — accepted as a rare, low-cost
 * false positive. Same-day duplicates are handled separately in
 * envelopeIssueSummary.
 */
export function crossDayIssues(envelopes: DailyEnvelope[]): string[] {
  const issues: string[] = [];
  const firstDateForName = new Map<string, string>();
  const byDateAsc = [...envelopes].sort((a, b) => a.date.localeCompare(b.date));

  for (const envelope of byDateAsc) {
    for (const item of visibleItems(envelope)) {
      const names = itemNames(item);

      let firstSeen: string | undefined;
      for (const name of names) {
        const prev = firstDateForName.get(name);
        if (prev && prev < envelope.date && (!firstSeen || prev < firstSeen)) {
          firstSeen = prev;
        }
      }

      if (firstSeen && (item.days_on_list === undefined || item.days_on_list < 2)) {
        issues.push(
          `${item.id} repeats a meme first seen on ${firstSeen} but days_on_list is ${
            item.days_on_list ?? "unset"
          } (expected >= 2)`,
        );
      }

      for (const name of names) {
        if (!firstDateForName.has(name)) {
          firstDateForName.set(name, envelope.date);
        }
      }
    }
  }

  return issues;
}

// Code-enforced content policy: 时事政治 must never reach published items, even when memeified
// (prompt rules leak — e.g. a "UK PM" cat meme). High-signal political role/institution terms;
// a hit fails validation so the agent self-corrects and a bad item can never be published.
// High-signal political-SUBJECT markers only — terms whose presence means the item is ABOUT
// politics, not ones a non-political meme might mention in passing (e.g. "议会"/"议员" appear
// when a gesture merely spreads to a parliament). The prompt rule is the primary defense; this
// code gate is the backstop that fails the build on the clear cases (e.g. "英国首相").
const POLITICS_TERMS = [
  "首相", "总统", "总理", "国家主席", "大选", "弹劾", "政变",
  "白宫", "克里姆林", "执政党", "在野党",
];

export function politicalContentIssues(envelope: DailyEnvelope): string[] {
  const issues: string[] = [];
  for (const item of visibleItems(envelope)) {
    const haystack = [
      item.title,
      item.summary,
      item.origin,
      item.usage,
      item.why_spread,
      item.fun_point,
      item.brand_usage,
      item.risk.note,
      ...item.aliases,
    ].join(" ");
    const hit = POLITICS_TERMS.find((term) => haystack.includes(term));
    if (hit) {
      issues.push(`${item.id} contains political term "${hit}" — 时事政治 must be dropped`);
    }
  }
  return issues;
}

// Hard backstop for the product's explicit "do not memeify" categories. Terms stay
// deliberately high-signal: the prompt remains the broader editorial gate, while this
// deterministic check blocks clear disaster/public-safety, privacy/minor, abuse, and
// illegal-rumor cases from reaching a public page.
const CONTENT_SAFETY_BUCKETS = [
  {
    label: "灾害/公共安全",
    terms: [
      "台风", "地震", "洪水", "洪涝", "暴雨", "雷暴", "山火", "火灾",
      "坠机", "空难", "车祸", "灾情", "遇难", "伤亡", "救灾", "防灾",
    ],
  },
  {
    label: "隐私/未成年人",
    terms: [
      "未成年人", "未成年", "偷拍", "裸照", "裸身", "裸体", "人肉搜索",
      "开盒", "隐私泄露", "身份证号", "手机号曝光",
    ],
  },
  {
    label: "人身攻击/违法谣言",
    terms: ["人身攻击", "侮辱", "辱骂", "网暴", "造谣", "谣言", "色情", "赌博", "毒品"],
  },
] as const;

function publicItemText(item: MemeItem): string {
  return [
    item.title,
    ...item.aliases,
    item.summary,
    item.origin,
    item.usage,
    item.fun_point,
    item.why_spread,
    ...item.sources.flatMap((source) => [source.title ?? "", source.note]),
  ].join(" ");
}

export function safetyContentIssues(envelope: DailyEnvelope): string[] {
  const issues: string[] = [];
  for (const item of visibleItems(envelope)) {
    const text = publicItemText(item);
    for (const bucket of CONTENT_SAFETY_BUCKETS) {
      const hit = bucket.terms.find((term) => text.includes(term));
      if (hit) issues.push(`${item.id} contains safety term "${hit}" (${bucket.label}) — 必须丢弃`);
    }
  }
  return issues;
}

// SOFT platform-diversity check (WARN, never fail — mirrors the news 国际 soft check). 小红书/抖音
// are chronically under-represented as meme origins vs 微博/聚合榜（历史上各仅 5 条 source, 且单日常
// 9/10 条只挂 weibo）. On a FULL day (>=5 visible memes) this warns when fewer than 2 of them tag 抖音
// or 小红书 — surfacing the 微博-dominance over time WITHOUT blocking a genuinely 微博-driven day, and
// WITHOUT ever pressuring the agent to fabricate: diversity must come from HONEST tags/sources, so this
// stays advisory only (thin days are exempt — they aren't expected to be diverse).
const UNDERREPRESENTED_PLATFORMS = ["douyin", "xiaohongshu"];
const MIN_ITEMS_FOR_DIVERSITY_CHECK = 5;
const MIN_UNDERREPRESENTED_ITEMS = 2;

export function platformDiversityWarnings(envelope: DailyEnvelope): string[] {
  const items = visibleItems(envelope);
  if (items.length < MIN_ITEMS_FOR_DIVERSITY_CHECK) return [];
  const underCount = items.filter((item) =>
    item.platform.some((platform) => UNDERREPRESENTED_PLATFORMS.includes(platform)),
  ).length;
  if (underCount < MIN_UNDERREPRESENTED_ITEMS) {
    return [
      `only ${underCount}/${items.length} memes tag 抖音/小红书 — chronically under-represented vs 微博/聚合榜; aim for >=${MIN_UNDERREPRESENTED_ITEMS} on a full day (soft target; honest tags/sources only, never fabricate)`,
    ];
  }
  return [];
}

export function envelopeIssueSummary(envelope: DailyEnvelope): string[] {
  const issues: string[] = [];

  issues.push(...minimumDailyPublicationIssues(envelope));

  if (envelope.status === "published" && envelope.items.length === 0) {
    issues.push("published envelope cannot have zero items");
  }

  for (const item of envelope.items) {
    if (!hasPublishableEvidence(item)) {
      issues.push(`${item.id} lacks publishable evidence`);
    }
  }

  if (envelope.run_report.published !== visibleItems(envelope).length) {
    issues.push("run_report.published does not match visible item count");
  }

  // Temporal invariants use the trusted publish stamp when present. Agent-provided
  // generated/captured times may never claim an event after the actual publish moment.
  const generatedMs = Date.parse(envelope.generated_at);
  const publishedMs = envelope.published_at ? Date.parse(envelope.published_at) : undefined;
  if (publishedMs !== undefined && generatedMs > publishedMs) {
    issues.push(`generated_at ${envelope.generated_at} is after published_at ${envelope.published_at}`);
  }
  const sourceCutoffMs = publishedMs ?? generatedMs;
  const sourceCutoffLabel = publishedMs === undefined ? "generated_at" : "published_at";
  for (const item of envelope.items) {
    for (const source of item.sources) {
      if (Date.parse(source.captured_at) > sourceCutoffMs) {
        issues.push(
          `${item.id} source captured_at ${source.captured_at} is after ${sourceCutoffLabel}`,
        );
      }
    }
  }

  // Same-day duplicates: two visible items that are the same meme (by normalized
  // title/alias) within one envelope. crossDayIssues only covers earlier days.
  const seenNames = new Map<string, string>();
  for (const item of visibleItems(envelope)) {
    const names = itemNames(item);
    for (const name of names) {
      const prior = seenNames.get(name);
      if (prior && prior !== item.id) {
        issues.push(`${item.id} duplicates "${name}" already published today by ${prior}`);
      } else if (!seenNames.has(name)) {
        seenNames.set(name, item.id);
      }
    }
  }

  issues.push(...politicalContentIssues(envelope));
  issues.push(...safetyContentIssues(envelope));

  return issues;
}
