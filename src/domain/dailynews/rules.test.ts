import { describe, expect, it } from "vitest";
import type { NewsEnvelope, NewsItem, NewsTier } from "./schema";
import { NewsItemSchema } from "./schema";
import {
  envelopeIssueSummary,
  hasPublishableEvidence,
  headlineCasualtyIssues,
  heatRankIssues,
  internationalCoverageWarnings,
  redLineIssues,
  visibleNews,
} from "./rules";

function source(tier: NewsTier, url: string): NewsItem["sources"][number] {
  return { tier, outlet: "测试媒体", url, captured_at: "2026-06-29T07:15:00+08:00", note: "公开页可访问。" };
}

const baseItem: NewsItem = {
  id: "2026-06-29-shenzhou-launch",
  headline: "🚀 神舟再出发，又一次和你一起见证",
  summary: "新一批航天员顺利进驻空间站，全民共享的高光时刻。",
  category: "国家高光",
  heat_rank: 1,
  wechat_bridge: { capability: "视频号直播", note: "视频号大事件直播，朋友圈共享荣耀的标准场景。" },
  filter_pass: {
    consensus: "全民共识、零争议的国家成就。",
    bridge_fit: "视频号直播权利天然承接。",
    tone_fit: "克制见证，不喧哗。",
  },
  risk: { level: "safe", note: "无敏感点。" },
  sources: [source("state_media", "https://example.com/xinhua-shenzhou")],
  published: true,
};

function envelopeWith(items: NewsItem[], status: NewsEnvelope["status"], publishedOverride?: number): NewsEnvelope {
  return {
    schema_version: "1.0",
    policy_version: "1.0",
    rubric_version: "1.0",
    date: "2026-06-29",
    generated_at: "2026-06-29T07:42:00+08:00",
    status,
    run_report: {
      candidates_scanned: items.length,
      published: publishedOverride ?? (status === "published" || status === "partial" ? items.length : 0),
      dropped_safety: {},
      dropped_low_confidence: 0,
      sources: ["state_media"],
      evidence_summary: {
        candidates_with_urls: items.length,
        official_sources: 0,
        state_media_sources: items.length,
        major_media_sources: 0,
        aggregator_sources: 0,
        dropped_insufficient_evidence: 0,
      },
    },
    items,
  };
}

function minimumDay(
  date: string,
  status: NewsEnvelope["status"],
  itemCount: number,
): NewsEnvelope {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    ...baseItem,
    id: `${date}-verified-${index + 1}`,
    headline: `📰 今日民生进展第${index + 1}条`,
    heat_rank: index + 1,
    sources: [
      source("state_media", `https://example.com/${date}/news-${index + 1}`),
    ],
  }));
  const envelope = envelopeWith(items, status);
  envelope.date = date;
  return envelope;
}

describe("hasPublishableEvidence (authority bar)", () => {
  it("accepts a single official/state_media source", () => {
    expect(hasPublishableEvidence(baseItem)).toBe(true);
  });

  it("accepts >=2 distinct URLs with a major_media source", () => {
    const item = { ...baseItem, sources: [source("major_media", "https://a.example/x"), source("aggregator", "https://b.example/y")] };
    expect(hasPublishableEvidence(item)).toBe(true);
  });

  it("rejects a lone aggregator", () => {
    const item = { ...baseItem, sources: [source("aggregator", "https://only.example/x")] };
    expect(hasPublishableEvidence(item)).toBe(false);
  });

  it("rejects two aggregators (aggregator never qualifies alone)", () => {
    const item = { ...baseItem, sources: [source("aggregator", "https://a.example/x"), source("aggregator", "https://b.example/y")] };
    expect(hasPublishableEvidence(item)).toBe(false);
  });
});

describe("visibleNews", () => {
  it("returns published items for a published envelope", () => {
    expect(visibleNews(envelopeWith([baseItem], "published"))).toHaveLength(1);
  });

  it("hides everything for skipped/held", () => {
    expect(visibleNews(envelopeWith([baseItem], "skipped"))).toHaveLength(0);
    expect(visibleNews(envelopeWith([baseItem], "held"))).toHaveLength(0);
  });
});

describe("redLineIssues", () => {
  it("does NOT flag a clean 国家高光 item that names an athlete", () => {
    const sport = { ...baseItem, id: "2026-06-29-win", headline: "🏆 中国队夺冠，朋友圈一起沸腾", summary: "运动员们拼到最后一刻，全民共享的荣耀瞬间。" };
    expect(redLineIssues(envelopeWith([sport], "published"))).toHaveLength(0);
  });

  it("flags a political subject in the headline", () => {
    const pol = { ...baseItem, headline: "某国总统访华引热议", summary: "外交场合的会谈细节。" };
    const issues = redLineIssues(envelopeWith([pol], "published"));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("政治/地缘/冲突");
  });

  it("does NOT flag a 民生 disaster-event item (v2: 地震 is now a wanted topic)", () => {
    const quake = { ...baseItem, id: "2026-06-29-quake", headline: "🌏 四川宜宾发生地震，当地启动应急响应", summary: "震区交通与通信正在逐步恢复，救援力量已抵达现场。" };
    expect(redLineIssues(envelopeWith([quake], "published"))).toHaveLength(0);
  });

  it("flags a 政府/政策 subject in the headline (too 官方色彩)", () => {
    const policy = { ...baseItem, headline: "国务院部署下一阶段经济工作", summary: "会议印发相关规划纲要。" };
    const issues = redLineIssues(envelopeWith([policy], "published"));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("政府/政策");
  });

  it("flags a celebrity-scandal subject", () => {
    const scandal = { ...baseItem, headline: "某明星塌房上热搜", summary: "粉丝脱粉回踩。" };
    const issues = redLineIssues(envelopeWith([scandal], "published"));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("明星丑闻");
  });
});

describe("headlineCasualtyIssues", () => {
  it("flags casualty/relocation figures in a disaster headline", () => {
    const dis = { ...baseItem, id: "2026-06-29-quake2", headline: "🌏某地地震，13人轻伤225人转移", summary: "应急响应已启动，救援力量抵达现场处置，社会秩序稳定。" };
    expect(headlineCasualtyIssues(envelopeWith([dis], "published")).length).toBeGreaterThan(0);
  });

  it("does NOT flag a neutral people-count headline", () => {
    const ok = { ...baseItem, id: "2026-06-29-run", headline: "🏃5000人参与城市马拉松", summary: "清晨开跑，沿途设置补给与医疗保障点位，市民有序参与。" };
    expect(headlineCasualtyIssues(envelopeWith([ok], "published"))).toHaveLength(0);
  });
});

describe("NewsItemSchema source url hardening (no javascript:/data:)", () => {
  it("rejects a non-http(s) source url", () => {
    const bad = { ...baseItem, sources: [source("state_media", "javascript:alert(1)")] };
    expect(NewsItemSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts an https source url", () => {
    expect(NewsItemSchema.safeParse(baseItem).success).toBe(true);
  });

  it("requires a named outlet for every reader-visible source", () => {
    const unnamed = {
      ...baseItem,
      sources: [{
        tier: "state_media",
        url: "https://example.com/unnamed",
        captured_at: "2026-06-29T07:15:00+08:00",
        note: "公开页可访问。",
      }],
    };
    expect(NewsItemSchema.safeParse(unnamed).success).toBe(false);
  });
});

describe("heatRankIssues", () => {
  it("passes for contiguous 1..N", () => {
    const items = [
      { ...baseItem, id: "2026-06-29-a", heat_rank: 1 },
      { ...baseItem, id: "2026-06-29-b", headline: "节日的味道又回来了", heat_rank: 2 },
    ];
    expect(heatRankIssues(envelopeWith(items, "published"))).toHaveLength(0);
  });

  it("fails on a gap", () => {
    const items = [
      { ...baseItem, id: "2026-06-29-a", heat_rank: 1 },
      { ...baseItem, id: "2026-06-29-b", headline: "节日的味道又回来了", heat_rank: 3 },
    ];
    expect(heatRankIssues(envelopeWith(items, "published")).length).toBeGreaterThan(0);
  });

  it("fails on a duplicate rank", () => {
    const items = [
      { ...baseItem, id: "2026-06-29-a", heat_rank: 1 },
      { ...baseItem, id: "2026-06-29-b", headline: "节日的味道又回来了", heat_rank: 1 },
    ];
    expect(heatRankIssues(envelopeWith(items, "published")).length).toBeGreaterThan(0);
  });
});

describe("internationalCoverageWarnings (soft — warn, never fail)", () => {
  it("warns when no 国际 item is present", () => {
    const warnings = internationalCoverageWarnings(envelopeWith([baseItem], "published"));
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("国际");
  });

  it("is silent when a 国际 item is present", () => {
    const intl = { ...baseItem, id: "2026-06-29-intl", category: "国际" as const, headline: "🔭 詹姆斯·韦布望远镜再传新影像", summary: "国际团队公布一批深空图像，展示遥远星系的细节。" };
    expect(internationalCoverageWarnings(envelopeWith([baseItem, intl], "published"))).toHaveLength(0);
  });

  it("is silent for an empty/skipped envelope (nothing to warn about)", () => {
    expect(internationalCoverageWarnings(envelopeWith([baseItem], "skipped"))).toHaveLength(0);
  });

  it("does not affect the hard-fail envelopeIssueSummary", () => {
    // a clean domestic-only envelope must still PASS the hard gate (warning is separate)
    expect(envelopeIssueSummary(envelopeWith([baseItem], "published"))).toHaveLength(0);
  });
});

describe("envelopeIssueSummary", () => {
  it("passes a clean published envelope", () => {
    expect(envelopeIssueSummary(envelopeWith([baseItem], "published"))).toHaveLength(0);
  });

  it("flags a run_report.published mismatch", () => {
    const env = envelopeWith([baseItem], "published", 5);
    expect(envelopeIssueSummary(env).some((i) => i.includes("run_report.published"))).toBe(true);
  });

  it("flags a published envelope with zero items", () => {
    expect(envelopeIssueSummary(envelopeWith([], "published")).some((i) => i.includes("zero items"))).toBe(true);
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
    expect(envelopeIssueSummary(minimumDay("2026-07-26", "published", 2))).toContain(
      "2026-07-26 requires status published/partial with at least 3 visible items; got published with 2",
    );
  });

  it.each(["published", "partial"] as const)(
    "accepts post-cutoff status %s with 3 verified visible items",
    (status) => {
      expect(envelopeIssueSummary(minimumDay("2026-07-26", status, 3))).toHaveLength(0);
    },
  );

  it("flags generated/source timestamps after the trusted publish time", () => {
    const env = envelopeWith([baseItem], "published");
    env.published_at = "2026-06-29T07:10:00+08:00";
    const issues = envelopeIssueSummary(env);
    expect(issues.some((issue) => issue.includes("generated_at") && issue.includes("published_at"))).toBe(true);
    expect(issues.some((issue) => issue.includes("source captured_at") && issue.includes("published_at"))).toBe(true);
  });
});
