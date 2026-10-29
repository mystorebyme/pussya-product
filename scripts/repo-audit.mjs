#!/usr/bin/env node
/**
 * repo-audit — "kya ye repo un top skill repos jaisi discipline rakhta hai?"
 *
 * Kyun: Instagram/YouTube par jo top Claude-Code/Codex skill repos chal rahe hain
 * (Superpowers, Matt Pocock, Karpathy, Anthropic, Ponytail, Graphify, Agent Skills)
 * unka core message ek hi hai —
 *   1. pehle plan, phir code, phir test, phir debug (Superpowers)
 *   2. chhote, akele chalne wale skills (Matt Pocock / Anthropic format)
 *   3. ek chhota, sachcha instruction file (Karpathy)
 *   4. sabse chhota diff, over-engineering nahi (Ponytail)
 *   5. codebase ka naqsha jo machine padh sake (Graphify)
 *   6. production-grade gates — typecheck, tests, CI (Agent Skills)
 *
 * Ye script un 6 baaton ko **naap**ta hai (guess nahi karta) aur ek report likhta hai.
 *
 * Chalaiye:  npm run audit            # table + docs/00-overview/repo-audit.md
 *            npm run audit -- --json  # machine-readable
 *            npm run audit -- --check # CI: sirf exit code (fail = regression)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** node_modules/dist/.next chhod kar files dhundo */
function walk(dir, filter, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    // build outputs (`.cloudflare` = vinext/Workers, `.wrangler` = local workerd state)
    if (
      ["node_modules", ".next", "dist", ".git", "out", ".turbo", ".data", ".cloudflare", ".wrangler"].includes(
        entry.name,
      )
    )
      continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, filter, out);
    else if (filter(rel)) out.push(rel);
  }
  return out;
}

const SOURCE = walk("apps", (f) => /\.(ts|tsx)$/.test(f)).concat(
  walk("packages", (f) => /\.(ts|tsx)$/.test(f)),
);
const TEST_FILES = walk(
  "tests",
  (f) => f.endsWith(".test.ts") || f.endsWith(".mjs") || f.endsWith(".spec.ts"),
);
const SKILLS = fs.existsSync(path.join(ROOT, ".claude/skills"))
  ? fs
      .readdirSync(path.join(ROOT, ".claude/skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

const lineCount = (rel) => read(rel).split("\n").length;
const count = (files, regex) =>
  files.reduce((total, file) => total + (read(file).match(regex) ?? []).length, 0);

/* ─────────────────────────── 1. repo facts ─────────────────────────── */

const catalog = JSON.parse(read("database/seeds/catalog.json"));
const facts = {
  products: catalog.products.length,
  collections: (catalog.collections ?? []).length,
  sourceFiles: SOURCE.length,
  sourceLines: SOURCE.reduce((total, file) => total + lineCount(file), 0),
  testFiles: TEST_FILES.length,
  skills: SKILLS.length,
  docsPages: walk("docs", (f) => f.endsWith(".md")).length,
};

/* ──────────────── 2. skills: Anthropic/Matt Pocock format ──────────────── */

const skillChecks = SKILLS.map((name) => {
  const file = `.claude/skills/${name}/SKILL.md`;
  if (!exists(file)) return { name, ok: false, problems: ["SKILL.md nahi hai"] };
  const text = read(file);
  const lines = text.split("\n").length;
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text);
  const problems = [];
  if (!frontmatter) problems.push("YAML frontmatter nahi");
  const fm = frontmatter?.[1] ?? "";
  if (!/^name:\s*\S+/m.test(fm)) problems.push("frontmatter me `name` nahi");
  const description = /^description:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? "";
  if (!description) problems.push("frontmatter me `description` nahi");
  if (description.length > 500) problems.push("description bahut lambi (>500 chars)");
  if (lines > 500) problems.push("SKILL.md bahut lamba (>500 lines) — references/ me todo");
  // jo bhi `.claude/skills/x` ya `docs/...` reference diya ho wo maujood ho
  for (const ref of text.matchAll(/`((?:\.claude\/skills|docs|scripts|tests)\/[A-Za-z0-9._/-]+)`/g)) {
    const target = ref[1].replace(/[.,]$/, "");
    if (!exists(target)) problems.push(`toota reference: ${target}`);
  }
  return { name, ok: problems.length === 0, lines, problems };
});

/* ────────── 3. API route → test naqsha (Graphify jaisa map) ────────── */

const ROUTES = walk("apps/web/src/app/api", (f) => f.endsWith("route.ts")).map((file) =>
  file.replace("apps/web/src/app", "").replace(/\/route\.ts$/, ""),
);
const testCorpus = TEST_FILES.map((file) => read(file)).join("\n");

/**
 * Jaan-boojh kar dormant routes — inka test nahi hoga (owner rule: koi third-party
 * payment gateway nahi). Audit inhe "untested" me nahi ginta, alag se dikhata hai.
 */
const DORMANT_ROUTES = ["/api/payments/webhook/[gateway]", "/api/webhooks/razorpay", "/api/admin/checkout-events"];

const routeMap = ROUTES.map((route) => {
  // `/api/orders/[orderNumber]/public` → test me `public` ya poora path likha ho
  const literal = route.replace(/\[[^\]]+\]/g, "");
  const segments = route.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  // route file ka poora path, URL, aur aakhri segment — teeno tarah se test dhoondo
  const filePath = `apps/web/src/app${route}/route.ts`;
  const matched = [route, literal, filePath, `/api/${last}`, `/${last}/`].some(
    (needle) => needle && needle.length > 3 && testCorpus.includes(needle),
  );
  if (DORMANT_ROUTES.includes(route)) return { route, tested: true, dormant: true };
  return { route, tested: matched };
});
const untestedRoutes = routeMap.filter((item) => !item.tested).map((item) => item.route);
const dormantRoutes = routeMap.filter((item) => item.dormant).map((item) => item.route);
const activeRoutes = routeMap.filter((item) => !item.dormant);

/* ───────────────── 4. hygiene (Ponytail / Agent Skills) ───────────────── */

const hygiene = {
  anys: count(SOURCE, /:\s*any\b/g),
  todos: count(SOURCE, /\b(TODO|FIXME|XXX)\b/g),
  consoleLogs: count(
    SOURCE.filter((file) => file.includes("/src/")),
    /console\.log\(/g,
  ),
  // secrets kabhi code me nahi (env se hi aate hain)
  hardcodedSecrets: count(SOURCE, /(sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.|ghp_[A-Za-z0-9]{20,})/g),
  // client bundle me server-only lib
  clientServerImports: count(
    SOURCE.filter((file) => /\.tsx$/.test(file) && /^"use client";/m.test(read(file))),
    /from "@\/lib\/store"/g,
  ),
  // koi third-party payment gateway nahi (owner rule)
  gatewayRefs: count(
    SOURCE.filter((file) => /next\.config|upi-payment|checkout/.test(file)),
    /razorpay/i,
  ),
  // support email customer-facing code me kahin nahi (owner rule).
  // Server-side audit actor ("admin@noorethnicwear.in") allowed hai — wo
  // customer ko kabhi dikhta nahi.
  publicEmails: SOURCE.filter(
    (file) =>
      file.startsWith("apps/web/src/components") ||
      file.startsWith("apps/web/src/content") ||
      /apps\/web\/src\/app\/.*page\.tsx$/.test(file),
  ).reduce((total, file) => {
    const hits = read(file)
      .split("\n")
      .filter((line) => /@(gmail|yahoo|outlook|noorclothing)\./i.test(line) && !/actor/i.test(line));
    return total + hits.length;
  }, 0),
};

/* ───────────── 5. instruction files: sachche + chhote (Karpathy) ───────── */

const claudeMd = exists("CLAUDE.md") ? read("CLAUDE.md") : "";
const agentsMd = exists("AGENTS.md") ? read("AGENTS.md") : "";
const instruction = {
  claudeLines: claudeMd ? claudeMd.split("\n").length : 0,
  agentsLines: agentsMd ? agentsMd.split("\n").length : 0,
  // CLAUDE.md me likhe numbers catalogue se match karte hain?
  productNumberStale: !claudeMd.includes(String(facts.products)),
  collectionNumberStale: !claudeMd.includes(String(facts.collections)),
  // purani baat jo owner ne mana kiya (Razorpay / support email)
  staleGatewayClaim: /razorpay/i.test(claudeMd) || /razorpay/i.test(agentsMd),
  staleEmailClaim: /@gmail\.|@noorclothing\./i.test(claudeMd) || /@gmail\.|@noorclothing\./i.test(agentsMd),
  // sab skills instruction file me listed hain?
  unlistedSkills: SKILLS.filter(
    (name) => !claudeMd.includes(name) && !agentsMd.includes(name) && !claudeMd.includes(`skills/${name}`),
  ),
  // workflow (plan → test → debug) likha hai?
  hasPlanStep: /brainstorm-plan|plan\b/i.test(agentsMd) && /brainstorm-plan/.test(agentsMd),
  hasDebugStep: /systematic-debugging/.test(agentsMd),
  hasMinimalDiff: /minimal-diff/.test(agentsMd),
};

/* ────────────────────────── 6. CI gates ────────────────────────── */

const ci = exists(".github/workflows/ci.yml") ? read(".github/workflows/ci.yml") : "";
const gates = {
  typecheck: /npm run typecheck/.test(ci),
  tests: /test:all|npm test/.test(ci),
  build: /npm run build|next build/.test(ci),
  smoke: /test:smoke/.test(ci),
  responsive: /test:responsive/.test(ci),
  audit: /npm run audit/.test(ci),
};

/* ────────────────────────── scorecard ────────────────────────── */

const pct = (ok, total) => (total === 0 ? 1 : ok / total);
const skillPassed = skillChecks.filter((skill) => skill.ok).length;
const routePassed = activeRoutes.filter((item) => item.tested).length;

const scores = {
  "Skills (format + refs)": pct(skillPassed, skillChecks.length),
  // denominator me dormant routes nahi (unka test jaan-boojh kar nahi hota)
  "Tests per route (Graphify map)": pct(routePassed, activeRoutes.length),
  "Hygiene (any/TODO/log/secrets)":
    (hygiene.anys === 0 ? 1 : 0) +
      (hygiene.todos === 0 ? 1 : 0) +
      (hygiene.consoleLogs === 0 ? 1 : 0) +
      (hygiene.hardcodedSecrets === 0 ? 1 : 0) +
      (hygiene.publicEmails === 0 ? 1 : 0) +
      (hygiene.gatewayRefs === 0 ? 1 : 0) >
    0
      ? [hygiene.anys, hygiene.todos, hygiene.consoleLogs, hygiene.hardcodedSecrets, hygiene.publicEmails, hygiene.gatewayRefs].filter(
          (value) => value === 0,
        ).length / 6
      : 1,
  "Instruction files (Karpathy)":
    [
      instruction.claudeLines > 0 && instruction.claudeLines <= 120,
      instruction.agentsLines > 0 && instruction.agentsLines <= 160,
      !instruction.productNumberStale,
      !instruction.collectionNumberStale,
      !instruction.staleGatewayClaim,
      !instruction.staleEmailClaim,
      instruction.unlistedSkills.length === 0,
      instruction.hasPlanStep,
      instruction.hasDebugStep,
      instruction.hasMinimalDiff,
    ].filter(Boolean).length / 10,
  "CI gates (Agent Skills)": Object.values(gates).filter(Boolean).length / Object.keys(gates).length,
};

const grade = (value) => (value >= 0.95 ? "A" : value >= 0.85 ? "B" : value >= 0.7 ? "C" : value >= 0.5 ? "D" : "F");

const report = {
  facts,
  skills: skillChecks,
  routes: {
    total: activeRoutes.length,
    tested: activeRoutes.filter((item) => item.tested).length,
    untested: untestedRoutes,
    dormant: dormantRoutes,
  },
  hygiene,
  instruction,
  gates,
  scores,
  grade: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, grade(value)])),
};

/* ────────────────────────── output ────────────────────────── */

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const table = (rows) => rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  const markdown = `# Repo audit — top skill repos ke hisaab se

> Auto-generated: \`npm run audit\` (is file ko haath se edit na karein).
> Benchmark: Superpowers (plan → test → debug), Matt Pocock & Anthropic (chhote skills),
> Karpathy (ek sachcha instruction file), Ponytail (minimal diff), Graphify (code map),
> Agent Skills (production gates).

## Scorecard

| Dimension | Score | Grade |
| --- | --- | --- |
${table(Object.entries(scores).map(([key, value]) => [key, `${Math.round(value * 100)}%`, grade(value)]))}

## Repo facts

| Metric | Value |
| --- | --- |
${table(Object.entries(facts).map(([key, value]) => [key, String(value)]))}

## Skills (${skillPassed}/${skillChecks.length} pass)

| Skill | Lines | Status |
| --- | --- | --- |
${table(skillChecks.map((skill) => [skill.name, String(skill.lines ?? 0), skill.ok ? "✅" : `❌ ${skill.problems.join("; ")}`]))}

## API → test map (${routePassed}/${activeRoutes.length} active routes covered)

${untestedRoutes.length ? untestedRoutes.map((route) => `- ❌ \`${route}\``).join("\n") : "Sab active routes ka test hai ✅"}

Dormant (jaan-boojh kar bina test — third-party gateway nahi, owner rule):
${dormantRoutes.length ? dormantRoutes.map((route) => `- ⏸️ \`${route}\``).join("\n") : "—"}

## Hygiene

| Check | Count | Kya chahiye |
| --- | --- | --- |
| \`any\` type | ${hygiene.anys} | 0 |
| TODO/FIXME | ${hygiene.todos} | 0 |
| console.log | ${hygiene.consoleLogs} | 0 |
| hardcoded secrets | ${hygiene.hardcodedSecrets} | 0 |
| client me server-only import | ${hygiene.clientServerImports} | 0 |
| gateway (razorpay) refs | ${hygiene.gatewayRefs} | 0 (owner rule: sirf UPI) |
| public email refs | ${hygiene.publicEmails} | 0 (owner rule: sirf WhatsApp) |

## Instruction files

| Check | Value |
| --- | --- |
${table([
  ["CLAUDE.md lines", String(instruction.claudeLines)],
  ["AGENTS.md lines", String(instruction.agentsLines)],
  ["CLAUDE.md product count sach?", instruction.productNumberStale ? "❌ purana" : "✅"],
  ["CLAUDE.md collection count sach?", instruction.collectionNumberStale ? "❌ purana" : "✅"],
  ["Razorpay claim (owner: nahi)", instruction.staleGatewayClaim ? "❌" : "✅"],
  ["support email claim (owner: nahi)", instruction.staleEmailClaim ? "❌" : "✅"],
  ["unlisted skills", instruction.unlistedSkills.join(", ") || "—"],
  ["plan step (Superpowers)", instruction.hasPlanStep ? "✅" : "❌"],
  ["debug step (Superpowers)", instruction.hasDebugStep ? "✅" : "❌"],
  ["minimal-diff rule (Ponytail)", instruction.hasMinimalDiff ? "✅" : "❌"],
])}

## CI gates

| Gate | Present |
| --- | --- |
${table(Object.entries(gates).map(([key, value]) => [key, value ? "✅" : "❌"]))}
`;
  fs.writeFileSync(path.join(ROOT, "docs/00-overview/repo-audit.md"), markdown);
  console.log(markdown.split("\n").slice(0, 22).join("\n"));
  console.log(`\n→ docs/00-overview/repo-audit.md likh diya.`);
  console.log(
    `Grades: ${Object.entries(report.grade)
      .map(([key, value]) => `${key.split(" ")[0]} ${value}`)
      .join(" · ")}`,
  );
}

if (args.has("--check")) {
  const failures = [];
  if (skillPassed !== skillChecks.length) failures.push(`${skillChecks.length - skillPassed} skill(s) format fail`);
  if (hygiene.hardcodedSecrets > 0) failures.push("hardcoded secret");
  if (hygiene.publicEmails > 0) failures.push("site code me email (owner rule)");
  if (hygiene.gatewayRefs > 0) failures.push("gateway reference (owner rule)");
  if (instruction.staleGatewayClaim) failures.push("CLAUDE.md me Razorpay claim");
  if (instruction.staleEmailClaim) failures.push("instruction file me support email");
  if (instruction.unlistedSkills.length) failures.push(`unlisted skills: ${instruction.unlistedSkills.join(", ")}`);
  if (failures.length) {
    console.error(`\n❌ audit fail: ${failures.join(" · ")}`);
    process.exit(1);
  }
  console.log("\n✅ audit gates pass");
}
