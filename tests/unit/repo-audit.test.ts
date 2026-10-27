/**
 * Repo audit ke guards — jo cheez `npm run audit` naapta hai, wo dobara na toote.
 *
 * Kyun test: audit script khud ek tool hai; uske bharose CI fail/pass hota hai.
 * Agar script hi galat naape (jaise route map me dormant route count) to sab jhoot
 * green dikhega. Isliye script ka output bhi test karte hain.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function audit(args: string[] = []): string {
  return execFileSync("node", ["scripts/repo-audit.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 120_000,
  });
}

test("audit --json valid JSON deta hai aur poore hisse hain", () => {
  const report = JSON.parse(audit(["--json"]));
  for (const key of ["facts", "skills", "routes", "hygiene", "instruction", "gates", "scores", "grade"]) {
    assert.ok(key in report, `${key} report me hona chahiye`);
  }
  assert.equal(typeof report.facts.products, "number");
  assert.ok(report.facts.products > 400, "catalogue load hua");
  assert.ok(report.facts.skills >= 19, `skills count (mila ${report.facts.skills})`);
});

test("har skill Anthropic/Matt Pocock format me hai (frontmatter + chhoti)", () => {
  const report = JSON.parse(audit(["--json"]));
  const broken = report.skills.filter((skill: { ok: boolean }) => !skill.ok);
  assert.deepEqual(broken, [], "saari skills format-compliant honi chahiye");
  for (const skill of report.skills as { lines: number }[]) {
    assert.ok(skill.lines <= 500, "SKILL.md 500 line se chhoti");
  }
});

test("instruction files sachche hain (Karpathy test) — stale numbers/claims nahi", () => {
  const { instruction } = JSON.parse(audit(["--json"]));
  assert.equal(instruction.productNumberStale, false, "CLAUDE.md me product count purana hai");
  assert.equal(instruction.collectionNumberStale, false, "CLAUDE.md me collection count purana hai");
  assert.equal(instruction.staleGatewayClaim, false, "Razorpay claim nahi hona chahiye (owner rule)");
  assert.equal(instruction.staleEmailClaim, false, "support email claim nahi");
  assert.deepEqual(instruction.unlistedSkills, [], "har skill instruction file me listed ho");
  assert.equal(instruction.hasPlanStep, true, "AGENTS.md me plan step");
  assert.equal(instruction.hasDebugStep, true, "AGENTS.md me debug step");
  assert.equal(instruction.hasMinimalDiff, true, "AGENTS.md me minimal-diff rule");
});

test("hygiene gates: koi secret / email / gateway / any / TODO nahi", () => {
  const { hygiene } = JSON.parse(audit(["--json"]));
  assert.equal(hygiene.hardcodedSecrets, 0, "hardcoded secret");
  assert.equal(hygiene.publicEmails, 0, "customer-facing code me email (owner rule)");
  assert.equal(hygiene.gatewayRefs, 0, "payment gateway reference (owner rule: sirf UPI)");
  assert.equal(hygiene.anys, 0);
  assert.equal(hygiene.todos, 0);
});

test("route → test map: koi active API route bina test nahi", () => {
  const { routes } = JSON.parse(audit(["--json"]));
  assert.deepEqual(routes.untested, [], "untested route");
  assert.equal(routes.tested, routes.total);
});

test("audit --check CI me pass hota hai (regression nahi)", () => {
  const out = audit(["--check"]);
  assert.match(out, /audit gates pass/);
});
