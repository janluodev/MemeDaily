import { describe, expect, it } from "vitest";
import type { DailyEnvelope, MemeItem } from "./schema";
import { MemeItemSchema } from "./schema";
import {
  boardStreakFor,
  crossDayIssues,
  dedupeRecurring,
  envelopeIssueSummary,
  hasPublishableEvidence,
  lifecycleIssues,
  nameAppearanceDates,
  platformDiversityWarnings,
  publishedDates,
  safetyContentIssues,
  visibleItems,
} from "./rules";

const baseItem: MemeItem = {
  id: "2026-06-20-banwei",
  title: "班味",
  aliases: [],
  platform: ["douyin", "xiaohongshu"],
  type: "生活方式梗",
  summary: "形容上班久了身上的疲惫气质。",
  origin: "公开话题和榜单中出现的职场自嘲表达。",
  usage: "用于通勤、加班、周末前后状态对比。",
  fun_point: "把抽象疲惫具象成一种味道。",
  why_spread: "打工人共鸣强，表达门槛低。",
  lifecycle: "rising",
  brand_usage: "解压、出行、洗护品类可做去班味内容。",
  risk: { level: "low", note: "避免美化加班和内卷。" },
  score: 92,
  sources: [
    {
      tier: "platform_public",
      evidence_role: "popularity",
      platform: "douyin",
      url: "https://example.com/platform-topic",
      captured_at: "2026-06-20T07:15:00+08:00",
      note: "公开话题页可访问。",
    },
    {
      tier: "aggregator",
      evidence_role: "cross_platform",
      platform: "other",
      url: "https://example.com/archive-topic",
      captured_at: "2026-06-20T07:16:00+08:00",
      note: "公开榜单归档提到该话题。",
    },
  ],
  published: true,
};

function envelopeWith(item: MemeItem, status: DailyEnvelope["status"]): DailyEnvelope {
  return {
    schema_version: "1.0",
    policy_version: "1.0",
    rubric_version: "1.0",
    date: "2026-06-20",
    generated_at: "2026-06-20T07:42:00+08:00",
    status,
    run_report: {
      candidates_scanned: 1,
      published: status === "published" ? 1 : 0,
      dropped_safety: {},
      dropped_low_confidence: 0,
      sources: ["douyin"],
      evidence_summary: {
        candidates_with_urls: 1,
        platform_public_sources: 1,
        aggregator_sources: 1,
        search_media_sources: 0,
        spillover_sources: 0,
        dropped_insufficient_evidence: 0,
      },
    },
    items: [item],
  };
}

function minimumDay(
  date: string,
  status: DailyEnvelope["status"],
  itemCount: number,
): DailyEnvelope {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    ...baseItem,
    id: `${date}-verified-${index + 1}`,
    title: `合格梗${index + 1}`,
    sources: baseItem.sources.map((source, sourceIndex) => ({
      ...source,
      url: `https://example.com/${date}/meme-${index + 1}/source-${sourceIndex + 1}`,
    })),
  }));
  const envelope = envelopeWith(items[0] ?? baseItem, status);
  envelope.date = date;
  envelope.items = items;
  envelope.run_report.candidates_scanned = itemCount;
  envelope.run_report.published =
    status === "published" || status === "partial" ? itemCount : 0;
  return envelope;
}

describe("MemeDaily publication rules", () => {
  it("accepts two independent URLs with platform or aggregator evidence", () => {
    expect(hasPublishableEvidence(baseItem)).toBe(true);
  });

  it("rejects candidates supported only by third-layer sources", () => {
    const item = {
      ...baseItem,
      sources: baseItem.sources.map((source, index) => ({
        ...source,
        tier: index === 0 ? "search_media" : "spillover",
      })),
    } satisfies MemeItem;

    expect(hasPublishableEvidence(item)).toBe(false);
  });

  it("rejects candidates with duplicate source URLs", () => {
    const item = {
      ...baseItem,
      sources: baseItem.sources.map((source) => ({
        ...source,
        url: "https://example.com/same",
      })),
    } satisfies MemeItem;

    expect(hasPublishableEvidence(item)).toBe(false);
  });

  it("hides skipped envelopes even when items are present", () => {
    expect(visibleItems(envelopeWith(baseItem, "skipped"))).toHaveLength(0);
  });

  it("reports mismatched visible counts", () => {
    const envelope = envelopeWith(baseItem, "published");
    envelope.run_report.published = 0;

    expect(envelopeIssueSummary(envelope)).toContain(
      "run_report.published does not match visible item count",
    );
  });

  it("treats a partial envelope as visible like published", () => {
    expect(visibleItems(envelopeWith(baseItem, "partial"))).toHaveLength(1);
  });

  it("flags two items that are the same meme on the same day", () => {
    const envelope = envelopeWith(baseItem, "published");
    envelope.items = [baseItem, { ...baseItem, id: "2026-06-20-banwei-dup" }];
    envelope.run_report.published = 2;

    expect(envelopeIssueSummary(envelope).some((issue) => issue.includes("duplicates"))).toBe(
      true,
    );
  });

  it("flags a published envelope with zero items", () => {
    const envelope = envelopeWith(baseItem, "published");
    envelope.items = [];
    envelope.run_report.published = 0;

    expect(envelopeIssueSummary(envelope)).toContain("published envelope cannot have zero items");
  });

  it("keeps a historical skipped day valid before the minimum-output cutoff", () => {
    expect(envelopeIssueSummary(minimumDay("2026-07-25", "skipped", 0))).toHaveLength(0);
  });

  it.each(["skipped", "held"] as const)(
    "rejects post-cutoff status %s even with no filler",
    (status) => {
      expect(envelopeIssueSummary(minimumDay("2026-07-26", status, 0))).toContain(
        `2026-07-26 requires status published/partial with at least 3 visible items; got ${status} with 0`,
      );
    },
  );

  it("rejects a post-cutoff day with fewer than 3 visible items", () => {
    expect(envelopeIssueSummary(minimumDay("2026-07-26", "partial", 2))).toContain(
      "2026-07-26 requires status published/partial with at least 3 visible items; got partial with 2",
    );
  });

  it.each(["published", "partial"] as const)(
    "accepts post-cutoff status %s with 3 verified visible items",
    (status) => {
      expect(envelopeIssueSummary(minimumDay("2026-07-26", status, 3))).toHaveLength(0);
    },
  );

  it("flags an item that lacks publishable evidence", () => {
    const weak = {
      ...baseItem,
      sources: baseItem.sources.map((source) => ({ ...source, tier: "search_media" as const })),
    } satisfies MemeItem;
    const envelope = envelopeWith(weak, "published");
    envelope.run_report.published = 0;

    expect(envelopeIssueSummary(envelope)).toContain(`${weak.id} lacks publishable evidence`);
  });

  it("hides an item flagged published:false", () => {
    const hidden = { ...baseItem, published: false } satisfies MemeItem;
    expect(visibleItems(envelopeWith(hidden, "published"))).toHaveLength(0);
  });

  it("flags a source captured after the envelope was generated", () => {
    const envelope = envelopeWith(baseItem, "published");
    envelope.generated_at = "2026-06-20T07:00:00+08:00"; // before the sources' 07:15/07:16

    expect(
      envelopeIssueSummary(envelope).some((issue) => issue.includes("after generated_at")),
    ).toBe(true);
  });

  it("flags generated/source timestamps after the trusted publish time", () => {
    const envelope = envelopeWith(baseItem, "published");
    envelope.published_at = "2026-06-20T07:10:00+08:00";

    const issues = envelopeIssueSummary(envelope);
    expect(issues.some((issue) => issue.includes("generated_at") && issue.includes("published_at"))).toBe(true);
    expect(issues.some((issue) => issue.includes("source captured_at") && issue.includes("published_at"))).toBe(true);
  });

  it("flags an item whose subject is politics (首相)", () => {
    const political = { ...baseItem, summary: "铁打的拉里，流水的英国首相，网友这么调侃。" } satisfies MemeItem;
    expect(
      envelopeIssueSummary(envelopeWith(political, "published")).some((i) =>
        i.includes("political term"),
      ),
    ).toBe(true);
  });

  it("does NOT flag a non-political meme that only mentions a parliament in passing", () => {
    const ok = {
      ...baseItem,
      summary: "维京划船蔓延到议会大厅、商场扶梯，全员一起划起来了。",
    } satisfies MemeItem;
    expect(
      envelopeIssueSummary(envelopeWith(ok, "published")).some((i) => i.includes("political term")),
    ).toBe(false);
  });

  it("drops a typhoon-derived meme through the deterministic safety gate", () => {
    const unsafe = {
      ...baseItem,
      id: "2026-06-20-typhoon-template",
      title: "台风届变脸第一名",
    } satisfies MemeItem;
    expect(safetyContentIssues(envelopeWith(unsafe, "published"))[0]).toContain("灾害/公共安全");
  });

  it("drops a privacy-invasive meme through the deterministic safety gate", () => {
    const unsafe = {
      ...baseItem,
      id: "2026-06-20-privacy-template",
      origin: "邻居偷拍视频并发到公开群聊，随后引发接龙。",
    } satisfies MemeItem;
    expect(safetyContentIssues(envelopeWith(unsafe, "published"))[0]).toContain("隐私/未成年人");
  });

  it("does not treat a figurative old-show '塌房' critique as a hard safety hit", () => {
    const safe = {
      ...baseItem,
      id: "2026-06-20-old-show",
      summary: "重看旧剧发现设定塌房，是对剧情逻辑的幽默吐槽。",
    } satisfies MemeItem;
    expect(safetyContentIssues(envelopeWith(safe, "published"))).toHaveLength(0);
  });
});

describe("MemeDaily cross-day freshness", () => {
  function dayWith(date: string, item: MemeItem): DailyEnvelope {
    return { ...envelopeWith(item, "published"), date };
  }

  it("flags a meme that recurs without days_on_list >= 2", () => {
    const day1 = dayWith("2026-06-19", { ...baseItem, id: "2026-06-19-banwei" });
    const day2 = dayWith("2026-06-20", { ...baseItem, id: "2026-06-20-banwei" });

    expect(crossDayIssues([day2, day1]).length).toBeGreaterThan(0);
  });

  it("accepts a recurring meme that increments days_on_list", () => {
    const day1 = dayWith("2026-06-19", { ...baseItem, id: "2026-06-19-banwei" });
    const day2 = dayWith("2026-06-20", {
      ...baseItem,
      id: "2026-06-20-banwei",
      days_on_list: 2,
    });

    expect(crossDayIssues([day1, day2])).toHaveLength(0);
  });

  it("does not flag distinct memes on different days", () => {
    const day1 = dayWith("2026-06-19", { ...baseItem, id: "2026-06-19-banwei" });
    const day2 = dayWith("2026-06-20", {
      ...baseItem,
      id: "2026-06-20-gongzhu",
      title: "公主请上车",
      aliases: [],
    });

    expect(crossDayIssues([day1, day2])).toHaveLength(0);
  });
});

describe("MemeDaily 平台多样性软校验 (platformDiversityWarnings)", () => {
  // Build a full published day (>=5 items) from a per-item platform-tag list.
  const dayFrom = (platformsPerItem: MemeItem["platform"][]): DailyEnvelope => {
    const env = envelopeWith(baseItem, "published");
    env.items = platformsPerItem.map((platform, i) => ({
      ...baseItem,
      id: `2026-06-20-item-${i}`,
      title: `梗第${i}号`,
      aliases: [],
      platform,
    }));
    env.run_report.published = env.items.length;
    return env;
  };
  const weibo: MemeItem["platform"] = ["weibo"];
  const douyin: MemeItem["platform"] = ["douyin", "weibo"];

  it("warns when a full day has <2 memes tagging 抖音/小红书 (the 微博-dominance case)", () => {
    const day = dayFrom([weibo, weibo, weibo, weibo, douyin]); // only 1 of 5 touches 抖音/小红书
    const warnings = platformDiversityWarnings(day);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("抖音/小红书");
  });

  it("is silent when >=2 memes tag 抖音/小红书", () => {
    const day = dayFrom([weibo, weibo, weibo, douyin, douyin]); // 2 of 5 → ok
    expect(platformDiversityWarnings(day)).toHaveLength(0);
  });

  it("exempts a thin day (<5 visible memes) from the diversity check", () => {
    const thin = dayFrom([weibo, weibo, weibo]); // all 微博 but only 3 items → no warn
    expect(platformDiversityWarnings(thin)).toHaveLength(0);
  });

  it("is silent for a skipped day (nothing visible)", () => {
    const day = dayFrom([weibo, weibo, weibo, weibo, weibo]);
    day.status = "skipped";
    expect(platformDiversityWarnings(day)).toHaveLength(0);
  });

  it("does NOT affect the hard-fail envelopeIssueSummary (warning is separate)", () => {
    const day = dayFrom([weibo, weibo, weibo, weibo, weibo]);
    expect(envelopeIssueSummary(day)).toHaveLength(0);
  });
});

describe("MemeDaily 连续上榜天数 (boardStreakFor)", () => {
  function dayWith(date: string, item: MemeItem): DailyEnvelope {
    return { ...envelopeWith(item, "published"), date };
  }
  // A meme (matched by normalized title/alias) whose board presence has a gap: 06-23/24/25,
  // then absent, then recurs 07-06/07. The consecutive streak must reset on the recurrence.
  const viking = (date: string, title: string): DailyEnvelope =>
    dayWith(date, { ...baseItem, id: `${date}-viking`, title, aliases: ["维京划船"] });
  const gap = (date: string): DailyEnvelope =>
    dayWith(date, { ...baseItem, id: `${date}-other`, title: "别的梗", aliases: [] });
  const itemOf = (envelope: DailyEnvelope): MemeItem => {
    const item = envelope.items[0];
    if (!item) throw new Error("fixture envelope has no item");
    return item;
  };
  const v0625 = viking("2026-06-25", "一起划起来了");
  const v0706 = viking("2026-07-06", "一起Ro！维京划船");
  const v0707 = viking("2026-07-07", "一起Ro！维京划船");
  const v0623 = viking("2026-06-23", "一起划起来了");
  const history = [
    v0623,
    viking("2026-06-24", "一起划起来了"),
    v0625,
    gap("2026-06-26"),
    gap("2026-07-05"),
    v0706,
    v0707,
  ];
  const nameDates = nameAppearanceDates(history);
  const boardDates = publishedDates(history);

  it("counts up over a consecutive run", () => {
    expect(boardStreakFor(itemOf(v0625), "2026-06-25", nameDates, boardDates)).toBe(3);
  });

  it("resets to day 1 when the meme recurs after a gap (the viking bug)", () => {
    expect(boardStreakFor(itemOf(v0706), "2026-07-06", nameDates, boardDates)).toBe(1);
    expect(boardStreakFor(itemOf(v0707), "2026-07-07", nameDates, boardDates)).toBe(2);
  });

  it("never returns less than 1 for a shown item", () => {
    expect(boardStreakFor(itemOf(v0623), "2026-06-23", nameDates, boardDates)).toBe(1);
  });
});

describe("MemeDaily lifecycle 5-day rule", () => {
  function dayWith(date: string, item: MemeItem): DailyEnvelope {
    return { ...envelopeWith(item, "published"), date };
  }

  it("flags a declining meme younger than 5 days", () => {
    const day1 = dayWith("2026-06-18", { ...baseItem, id: "2026-06-18-banwei" });
    const day2 = dayWith("2026-06-21", {
      ...baseItem,
      id: "2026-06-21-banwei",
      lifecycle: "declining",
      days_on_list: 2,
    });
    expect(lifecycleIssues([day1, day2]).length).toBeGreaterThan(0); // 3 days < 5
  });

  it("accepts a declining meme first seen 5+ days ago", () => {
    const day1 = dayWith("2026-06-15", { ...baseItem, id: "2026-06-15-banwei" });
    const day2 = dayWith("2026-06-21", {
      ...baseItem,
      id: "2026-06-21-banwei",
      lifecycle: "declining",
      days_on_list: 2,
    });
    expect(lifecycleIssues([day1, day2])).toHaveLength(0); // 6 days >= 5
  });

  it("does not flag rising or peak", () => {
    const rising = dayWith("2026-06-21", { ...baseItem, lifecycle: "rising" });
    const peak = dayWith("2026-06-21", { ...baseItem, lifecycle: "peak" });
    expect(lifecycleIssues([rising])).toHaveLength(0);
    expect(lifecycleIssues([peak])).toHaveLength(0);
  });
});

describe("MemeItemSchema source url hardening (no javascript:/data:)", () => {
  it("rejects a non-http(s) source url", () => {
    const bad = {
      ...baseItem,
      sources: [{ ...baseItem.sources[0], url: "javascript:alert(1)" }, baseItem.sources[1]],
    };
    expect(MemeItemSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts http(s) source urls", () => {
    expect(MemeItemSchema.safeParse(baseItem).success).toBe(true);
  });
});

describe("MemeDaily schema gates", () => {
  it("rejects a title longer than 48 chars", () => {
    const result = MemeItemSchema.safeParse({ ...baseItem, title: "梗".repeat(49) });
    expect(result.success).toBe(false);
  });

  it("accepts the optional source.title field", () => {
    const result = MemeItemSchema.safeParse({
      ...baseItem,
      sources: baseItem.sources.map((source) => ({ ...source, title: "公开话题页·班味" })),
    });
    expect(result.success).toBe(true);
  });
});

describe("MemeDaily archive dedup", () => {
  it("keeps a recurring meme once, preferring the first (most recent) row", () => {
    const recent = { ...baseItem, id: "2026-06-21-banwei", date: "2026-06-21" };
    const older = { ...baseItem, id: "2026-06-19-banwei", date: "2026-06-19" };
    const out = dedupeRecurring([recent, older]); // caller passes date-desc
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("2026-06-21-banwei");
  });

  it("does not merge two genuinely different memes", () => {
    const a = { ...baseItem, id: "2026-06-21-banwei", date: "2026-06-21" };
    const b = { ...baseItem, id: "2026-06-21-gongzhu", title: "公主请上车", aliases: [], date: "2026-06-21" };
    expect(dedupeRecurring([a, b])).toHaveLength(2);
  });

  it("merges a recurrence that kept its id but reworded its title", () => {
    const recent = { ...baseItem, id: "2026-06-22-x", title: "失业还没来得及商务已追上", aliases: [], date: "2026-06-23" };
    const older = { ...baseItem, id: "2026-06-22-x", title: "还没失业商务先到了", aliases: [], date: "2026-06-22" };
    const out = dedupeRecurring([recent, older]);
    expect(out).toHaveLength(1);
    expect(out[0]?.date).toBe("2026-06-23");
  });
});
