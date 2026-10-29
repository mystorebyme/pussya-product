# Audit: "Top Claude Code / Codex skills" benchmark ke hisaab se

> Benchmark source: Instagram post "Top 10 Claude Code / Codex skills by GitHub stars" —
> Superpowers (303k), Karpathy Skills (219k), Anthropic Skills (182k), Ponytail (169k),
> Matt Pocock Skills (158k), Graphify (130k), Agent Skills (109k) + list ke baaki 3.
>
> Ye audit **zubani nahi** hai: har line ke saath command ya file hai.
> Dobara chalane ke liye: `npm run audit` → `docs/00-overview/repo-audit.md` regenerate hota hai.

## Result ek line me

| | Pehle | Ab |
| --- | --- | --- |
| Scorecard | Skills A · Tests F · Hygiene C · Instruction **F** · CI C | **Skills A · Tests A · Hygiene A · Instruction A · CI A** |
| Tests | 160 | **174** (0 fail) |
| Skills | 15 | **20** |
| Active API routes with test | 28/35 | **35/35** |
| "Ho gaya" ka proof | owner ke bharose | `npm run audit -- --check` CI me chalta hai |

---

## 1. Superpowers — "Plans, tests and debugs before it writes code"

**Aapke repo me pehle:** testing skill thi, par *plan* aur *debug* ka koi rasta nahi tha —
matlab agent seedha code likh deta tha.

**Audit finding:** `AGENTS.md` me sirf "Definition of done" tha; plan/debug steps nahi.

**Ab:**

| Cheez | Kahan |
| --- | --- |
| 5-step loop (Plan → Minimal diff → Implement+test → Debug → Verify+doc) | `AGENTS.md` (top table) |
| Plan banane ki skill (sawaal → 3-line plan → repo checklist) | `.claude/skills/brainstorm-plan/SKILL.md` |
| Debug ki skill (repro → evidence layer → 1 root cause → guard test) | `.claude/skills/systematic-debugging/SKILL.md` |
| Test pehle fail hona chahiye, phir pass — rule likha hua | `systematic-debugging` step 4 |
| Machine check | `tests/unit/repo-audit.test.ts` (plan/debug step maujood hain) |

---

## 2. Matt Pocock Skills — "Small, composable skills for real engineering"

**Pehle:** skills 46–69 line ki thi (accha), par **TypeScript discipline** ka koi skill nahi —
`any`, `as unknown as`, double cast ke liye rule nahi tha (bas CI me `tsc` tha).

**Ab:** `.claude/skills/typescript-discipline/SKILL.md` — boundary par `unknown`, ek hi jagah
narrow, `Record<Union, T>` se exhaustiveness, paisa integer me, `@ts-ignore` ban.
Har skill 55–70 line (500 se bahut kam) — "chhoti aur composable" test pass.

**Naap:** `npm run audit` → "Skills (format + refs) 100% · 20/20". Har skill me YAML frontmatter
(`name`, `description` ≤500 chars) aur jo bhi `docs/…`/`.claude/…` path likha ho wo **maujood** ho
(toota reference = fail).

---

## 3. Karpathy Skills — "One CLAUDE.md to improve how Claude codes"

**Yahi sabse bada gap tha (grade F).** `CLAUDE.md` me **jhooth** likha tha:

| Pehle likha tha | Sach |
| --- | --- |
| "287 products, 9 collections" | **446 products, 11 collections** |
| "Payments third-party (Razorpay); hum card data kabhi nahi chhoote" | UPI direct (``), **koi gateway nahi** (owner rule) |
| Skills list 15 | 20 (5 nayi) |

Stale instruction file ka nuksaan: agent purane rule par code likhta hai — jaise Razorpay
webhook wapas jodna, ya product count galat assume karna.

**Ab:** sachche numbers + "numbers yaad se na likhein, `npm run audit` se verify karein" +
UPI/no-email rule explicitly. Length 53 line / AGENTS 76 line (limit: 120 / 160).
**Guard:** audit script catalog se numbers compare karta hai — `CLAUDE.md` purana hote hi CI fail.

---

## 4. Anthropic Skills — "The official set: docs, PDFs, decks, design"

Anthropic ka skill format = `SKILL.md` + YAML frontmatter + progressive disclosure
(`references/`, `scripts/`), 500 line se chhoti.

| Check | Result |
| --- | --- |
| Frontmatter (`name` + `description`) | 20/20 ✅ |
| Description ≤ 500 chars (agent ko tab dikhti hai jab match ho) | 20/20 ✅ |
| 500 line se chhoti | 20/20 (max 70) ✅ |
| Toota reference (skill me likha path maujood nahi) | 0 ✅ |
| Instruction files me har skill listed | 0 unlisted ✅ |

Note: ye repo **code** hai (docs/deck banane ka kaam nahi), isliye Anthropic ke doc/PDF skills
copy nahi kiye — sirf unka **format + progressive disclosure** apnaya. Agar aage "invoice PDF /
owner deck" generate karne ka kaam aaye to `.claude/skills/docs-pdf` add karna hai.

---

## 5. Ponytail — "Codes like the laziest senior dev in the room"

**Pehle:** rules bikhre hue the ("no UI kit, no state library" `AGENTS.md` ke "Never do" me),
par "kitna diff theek hai" ka koi standard nahi.

**Ab:** `.claude/skills/minimal-diff/SKILL.md` — 5 sawaal, is repo ke banned dependencies ki
table (UI kit / state / animation / ORM / gateway / icon pack), diff red flags (`any`,
`@ts-ignore`, ek hi jagah use hone wala helper).

**Naap (asli numbers):** `any` = 0 · `TODO/FIXME` = 0 · `console.log` = 0 ·
hardcoded secret = 0 · client component me server-only import = 0 · gateway reference = 0.

---

## 6. Graphify — "Turns any codebase into a knowledge graph"

**Pehle:** `STRUCTURE.md` haath se likha hua tha (accha, par update hona bhoolta hai).

**Ab:** `npm run audit` ek **generated map** banata hai: har API route → usko test karne wali file,
skill format, instruction files, hygiene counts, CI gates → `docs/00-overview/repo-audit.md`.
Route map se 7 routes bina test ke mile the, ab `tests/unit/api-contracts.test.ts` unka
security contract pakadta hai (auth gate, 401/403/404, PII leak, `no-store`).

---

## 7. Agent Skills (addyosmani) — "Production-grade engineering skills"

Production-grade = **gate jo pass na ho to merge na ho**. CI me naya step:

```yaml
- name: Repo audit (skills · instruction files · hygiene · route map)
  run: npm run audit -- --check
```

Fail hone ke condition: koi skill toota · hardcoded secret · customer code me email ·
gateway reference · `CLAUDE.md` purana · unlisted skill. Pehle se maujood gates
(typecheck, unit+integration, build web/admin/api, smoke, responsive) waisi hi hain.

---

## 8. Jo abhi bhi baaki hai (imaandaari se)

| Cheez | Status | Kyun |
| --- | --- | --- |
| Live e2e (Playwright) CI me | ⚠️ alag job, build par depend | Build time 20 min ka limit; abhi 1 browser (chromium) |
| Coverage % (line-level) | ⚠️ nahi naapa | Is repo ka style contract-level test hai; line coverage `c8` se add ho sakta hai |
| Graphify jaisa **visual** graph | ⚠️ text map hai | HTML/SVG graph chahiye to `scripts/repo-graph.mjs` add karna hoga |
| Skills ka `references/` folder | ⚠️ sab single file | 70 line me kaam chal raha hai; bade skill (deploy) me hi references chahiye |
| GitHub repo par stars/README polish | ⚠️ 0 stars, description khaali | Repo public hai — description + topics set karne hain (5 min ka kaam) |

---

## GitHub repo — kya hai status

| Cheez | Value |
| --- | --- |
| Repo | **https://github.com/mystorebyme/tannu-product-** (public) |
| Default branch | `main` |
| Kaam wali branch | `arena/f713eef1-tannu-product` (PR open) |
| Stars / description | 0 · description khaali |
| CI | typecheck · test:all · audit · build (web/admin/api) · smoke · responsive |
| Pages | `https://mystorebyme.github.io/tannu-product-/` (static preview + order shell) |
| Last push | audit commit (ye round) |
