/**
 * input: tracked GitHub Actions workflow text
 * output: regression assertions for candidate scope, token confinement, SHA pins, and deploy gates
 * pos: static security contract for Codex Cloud candidate ingestion and trusted publication
 */
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const WORKFLOWS = path.join(process.cwd(), ".github/workflows");
const publisher = "codex-daily-pr-publish.yml";
const publishers = [publisher];
const writers = [...publishers, "daily-fallback.yml", "daily-news-fallback.yml"];
const NODE24_ACTIONS = new Map([
  ["actions/checkout", "3d3c42e5aac5ba805825da76410c181273ba90b1"],
  ["actions/setup-node", "820762786026740c76f36085b0efc47a31fe5020"],
  ["actions/configure-pages", "45bfe0192ca1faeb007ade9deae92b16b8254a0d"],
  ["actions/upload-pages-artifact", "fc324d3547104276b827a68afc52ff2a11cc49c9"],
  ["actions/deploy-pages", "368f82528645a54fb793d4d04e342629a3f51346"],
  ["actions/upload-artifact", "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"],
  ["actions/download-artifact", "3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c"],
]);

function publisherWorkflowSections(): { text: string; validate: string; publish: string } {
  const text = fs.readFileSync(path.join(WORKFLOWS, publisher), "utf8");
  return {
    text,
    validate: text.split("\n  publish:")[0] ?? "",
    publish: text.split("\n  publish:")[1] ?? "",
  };
}

it("confines Codex Cloud PR input to one dated JSON blob before any write token exists", () => {
  const { text, validate, publish } = publisherWorkflowSections();

  expect(text).toContain("pull_request_target:");
  expect(text).toContain("github.event.pull_request.head.repo.full_name == github.repository");
  expect(text).toContain("github.event.pull_request.base.ref == 'main'");
  expect(text).toContain("github.event.pull_request.draft == false");
  expect(text).toContain("types: [opened, reopened, synchronize, ready_for_review]");
  expect(text).toContain("^codex/daily-(meme|news)-([0-9]{4}-[0-9]{2}-[0-9]{2})$");
  expect(text).toContain('MINIMUM_DATE="2026-07-26"');
  expect(text).toContain('git cat-file -e "HEAD:${TARGET}"');
  expect(text).toContain('"${#CHANGED_FILES[@]}" -ne 1');
  expect(text).toContain("codex-artifact/candidate.json");
  expect(validate).toContain('validate-candidate "$TARGET" "$DATE" "$FEED" "$TODAY"');
  expect(text).toContain("ref: main");
  expect(text).not.toContain("ref: ${{ github.event.pull_request.head.sha }}");
  expect(validate).toContain("contents: read");
  expect(validate).not.toContain("contents: write");
  expect(validate).not.toContain("secrets.GITHUB_TOKEN");
  expect(publish).toContain("contents: read");
  expect(publish).not.toContain("contents: write");
  expect(publish).toContain("actions/download-artifact@");
  expect(publish).toContain("npm run check");
  expect(publish).toContain("live-before-repair.json");
  expect(publish).toContain('classify-live "$TARGET" "$DATE" "$FEED"');
  expect(publish).toContain(
    'preserve-repair codex-artifact/live-before-repair.json "$TARGET" "$DATE" "$FEED"',
  );
  expect(publish).toContain("REPAIR_KIND");
  expect(publish).toContain("editorially complete");
});

it("contains no active Anthropic publisher or GitHub cron after the Codex Cloud takeover", () => {
  const workflowFiles = fs.readdirSync(WORKFLOWS).filter((file) => file.endsWith(".yml"));
  const text = workflowFiles
    .map((file) => fs.readFileSync(path.join(WORKFLOWS, file), "utf8"))
    .join("\n");

  expect(workflowFiles).not.toContain("daily-publish.yml");
  expect(workflowFiles).not.toContain("daily-news-publish.yml");
  expect(workflowFiles).not.toContain("daily-catchup.yml");
  expect(workflowFiles).not.toContain("daily-news-catchup.yml");
  expect(text).not.toMatch(/anthropic|CLAUDE_CODE_OAUTH_TOKEN/i);
  expect(text).not.toContain("\n  schedule:");
});

it("does not duplicate ordinary CI for trusted daily data publication", () => {
  const ci = fs.readFileSync(path.join(WORKFLOWS, "ci.yml"), "utf8");

  expect(ci).toContain("branches: [main]");
  expect(ci).toContain(
    'paths-ignore:\n      - "data/daily/*.json"\n      - "data/daily-news/*.json"',
  );
  expect(ci).toContain(
    "if: github.event_name != 'pull_request' || !startsWith(github.head_ref, 'codex/daily-')",
  );
});

it("pins every external workflow action to a full commit SHA", () => {
  const files = fs.readdirSync(WORKFLOWS).filter((file) => file.endsWith(".yml"));
  for (const file of files) {
    const lines = fs.readFileSync(path.join(WORKFLOWS, file), "utf8").split("\n");
    for (const line of lines.filter((candidate) => /^-?\s*uses:/.test(candidate.trim()))) {
      if (line.includes("uses: ./")) continue;
      expect(line, `${file}: ${line.trim()}`).toMatch(/@[0-9a-f]{40}(?:\s|$)/);
    }
  }
});

it("uses the reviewed Node 24 releases for official JavaScript actions", () => {
  const text = fs.readdirSync(WORKFLOWS)
    .filter((file) => file.endsWith(".yml"))
    .map((file) => fs.readFileSync(path.join(WORKFLOWS, file), "utf8"))
    .join("\n");
  for (const [action, sha] of NODE24_ACTIONS) {
    expect(text).toContain(`${action}@${sha}`);
    expect(text.match(new RegExp(`${action}@(?!${sha})`, "g")) ?? []).toHaveLength(0);
  }
});

it("keeps the local runtime contract aligned with Node 22 automation", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as {
    packageManager?: string;
    engines?: Record<string, string>;
  };
  const automatedWorkflows = ["ci.yml", "pages.yml", ...writers];

  expect(packageJson.packageManager).toBe("npm@10.9.8");
  expect(packageJson.engines).toEqual({ node: "22.x", npm: "10.x" });
  for (const name of automatedWorkflows) {
    const workflow = fs.readFileSync(path.join(WORKFLOWS, name), "utf8");
    expect(workflow).toContain("node-version: 22");
  }
});

it("requires canonical checks and successful correlated Pages dispatches", () => {
  const pages = fs.readFileSync(path.join(WORKFLOWS, "pages.yml"), "utf8");
  const ci = fs.readFileSync(path.join(WORKFLOWS, "ci.yml"), "utf8");
  const codex = fs.readFileSync(path.join(WORKFLOWS, "codex-daily-pr-publish.yml"), "utf8");
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const buildJob = pages.split("\n  build:")[1]?.split("\n  deploy:")[0] ?? "";
  const deployJob = pages.split("\n  deploy:")[1] ?? "";
  expect(pages).toContain("npm run check");
  expect(pages.split("\njobs:")[0]).not.toContain("pages: write");
  expect(pages.split("\njobs:")[0]).not.toContain("id-token: write");
  expect(buildJob).toContain("contents: read");
  expect(buildJob).toContain("pages: read");
  expect(buildJob).not.toContain("pages: write");
  expect(deployJob).toContain("pages: write");
  expect(deployJob).toContain("id-token: write");
  expect(packageJson.scripts?.["audit:prod"]).toBe(
    "npm audit --omit=dev --audit-level=high",
  );
  expect(packageJson.scripts?.check).toContain("npm run audit:prod");
  expect(ci).toContain("npm run audit:prod");
  expect(buildJob).toContain("npm run check");
  expect(codex.split("\n  publish:")[0]).toContain("npm run check");
  expect(codex.split("\n  publish:")[1]).toContain("npm run check");
  expect(codex).toContain('bash scripts/dispatch-pages.sh "$SHA"');
  expect(codex).toContain('bash scripts/dispatch-pages.sh "$LIVE_SHA"');
  expect(codex).toContain("Pages success was verified for live main");
});

it.each(writers)("revalidates the final rebased tree before token-scoped push in %s", (name) => {
  const workflow = fs.readFileSync(path.join(WORKFLOWS, name), "utf8");
  const rebase = workflow.lastIndexOf("git pull --rebase origin main");
  const finalInstall = workflow.lastIndexOf("npm ci");
  const finalCheck = workflow.lastIndexOf("npm run check");
  const writeCredential = workflow.indexOf("PUBLISH_DEPLOY_KEY:", finalCheck);
  const push = workflow.indexOf("bash scripts/push-main-with-deploy-key.sh", writeCredential);

  expect(rebase).toBeGreaterThan(-1);
  expect(finalInstall).toBeGreaterThan(rebase);
  expect(finalCheck).toBeGreaterThan(finalInstall);
  expect(writeCredential).toBeGreaterThan(finalCheck);
  expect(push).toBeGreaterThan(writeCredential);
  expect(workflow).not.toContain("contents: write");
});

it("uses the dedicated deploy key as the sole protected-main transport", () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), "scripts", "push-main-with-deploy-key.sh"),
    "utf8",
  );

  expect(script).toContain('chmod 600 "$key_file"');
  expect(script).toContain("gh api meta");
  expect(script).toContain("StrictHostKeyChecking=yes");
  expect(script).toContain('git push "git@github.com:${repository}.git" HEAD:main');
  expect(script).not.toContain("echo \"$PUBLISH_DEPLOY_KEY\"");
});

it("keeps MemeDaily monitor issue lookup isolated from DailyNews issues", () => {
  const monitor = fs.readFileSync(path.join(WORKFLOWS, "daily-monitor.yml"), "utf8");

  expect(monitor).toContain('contains(\\"MemeDaily 未发布告警: ${DATE}\\")');
  expect(monitor).not.toContain('select(.title|contains(\\"${DATE}\\"))');
});
