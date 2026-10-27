#!/usr/bin/env node
/**
 * Apps Script code ko ek self-contained owner doc me export karta hai.
 *
 * Owner ko repo me file dhoondhne ki zaroorat nahi — `docs/00-overview/apps-script-code.md`
 * kholein, poora code wahin se copy karein. Code ka source of truth wahi
 * `scripts/google-apps-script/noor-sheets.gs` file rehti hai; ye script usse
 * markdown banati hai (isliye dono kabhi alag nahi hote).
 *
 *   node scripts/export-apps-script.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "scripts/google-apps-script/noor-sheets.gs");
const outPath = path.join(root, "docs/00-overview/apps-script-code.md");

const code = fs.readFileSync(sourcePath, "utf8").trimEnd();
const lineCount = code.split("\n").length;

const doc = `# Apps Script v3 — poora code (copy-paste)

> Ye file \`scripts/google-apps-script/noor-sheets.gs\` se **automatic** bani hai
> (\`node scripts/apps-script:export\` → \`node scripts/export-apps-script.mjs\`).
> Yahan se copy kariye, code hamesha latest rahega.
>
> **Step-by-step guide:** [\`apps-script-setup-steps.md\`](./apps-script-setup-steps.md)
> (permission, deploy, Vercel env, troubleshooting — sab detail me)

**Kya karta hai:** website ke sab events Google Sheet me likhta hai (16 tabs) —

| Tab | Kya aata hai |
| --- | --- |
| **Settings** | phone, WhatsApp, email, UPI ID, UPI name, announcement, free shipping, GSTIN |
| **Dashboard** | aaj ke orders, revenue, pending payment, naye messages (script khud bharta hai) |
| **Orders** | har order + har status change (append-only timeline) |
| **OrderItems** | order ki har item alag row (size, colour, qty, price) |
| **Payments** | UTR submit, "payment hui hai" claim, verify, fail, reverse |
| **Invoices** | GST invoice (taxable value, CGST/SGST/IGST, total) |
| **Shipments** | courier, AWB, tracking URL, dispatch/delivery status |
| **Checkout** | funnel: checkout khula → review → order placed → order fail (reason ke saath) |
| **Messages** | contact form (+ replied status) |
| **Newsletter** | email subscribers (duplicate apne aap skip) |
| **Reviews** | customer reviews (rating, verified, approve/pending) |
| **Coupons** | coupon codes, uses, limit, active |
| **Inventory** | stock ka har change (kisne, kitna, kyun) |
| **Audit** | admin panel ki activity |
| **Errors** | website/script ki error (debug ke liye) |
| **Sync** | har sync call ka hisaab (kab, kya, kitni rows) |

---

## Steps (ek baar, ~4 minute)

1. Google Sheet kholein → **Extensions → Apps Script**.
2. \`Code.gs\` ka purana code **poora delete** kariye (Ctrl+A → Delete) →
   neeche wala **poora code** paste kariye.
3. Sabse upar \`var TOKEN = 'CHANGE-ME-noor-token';\` me apna lamba random word daaliye
   (jaise \`noor-9f3k2m-2026\`). **Yahi token Vercel me daalna hai** — dono jagah same.
4. **Ctrl+S** (save).
5. Editor me upar function dropdown → **\`setup\`** → **Run** → permission maange to
   **Review permissions → apna account → Advanced → Go to … (unsafe) → Allow**.
   → Sheet me 16 tab + headers + default settings ban jayenge.
6. **Deploy → New deployment → (cog) Web app**
   - Description: \`noor v3\`
   - **Execute as: Me**
   - **Who has access: Anyone**   ⚠️ ("Anyone with a Google account" **nahi**)
   - **Deploy** → **Web app URL** copy kariye (\`.../exec\` par khatam hota hai).
7. Test: browser me
   \`<Web app URL>?action=health&token=<TOKEN>\`
   → \`{"ok":true,"version":"r27-2","spreadsheet":"…","sheets":[…]}\` aana chahiye.
   (version purana dikhe to Step 6 dobara — sirf Ctrl+S se code nahi chalta.)
8. **2 value Vercel me daaliye** (project \`noor-clothing\` → Settings → Environment
   Variables → **Redeploy**):

   | Variable | Value |
   | --- | --- |
   | \`GOOGLE_SHEETS_WEBAPP_URL\` | aapka \`/exec\` URL |
   | \`GOOGLE_SHEETS_TOKEN\` | aapka token |

9. Verify: website par test message + test order → Messages / Orders / OrderItems tabs me
   rows. Ya \`node scripts/sheets-selfcheck.mjs "<URL>" "<TOKEN>"\`.

**Optional:** function \`installTriggers\` → Run (roz 9 PM Dashboard + Sunday backup),
\`testSelf\` (poora check), \`repairHeaders\` (header repair), \`backupNow\` (Drive me copy).

---

## Code badalne par (yaad rakhiye)

Apps Script me code update karne ke baad **naya version deploy** karna padta hai:
**Deploy → Manage deployments → (pencil) Edit → Version: New version → Deploy**.
Warna purana code hi chalta rehta hai — owner ke saath yahi hua tha.

## Sheet ke rules

- **Header row (pehli row) na hataayein.** Script column ko **naam** se dhoondhta hai,
  isliye column ka order badalna theek hai; header ka naam badalna/hatana nahi.
- Naya column add karna theek hai (script khud bhi missing column add kar deta hai).
- \`Who has access: Anyone\` rakhein — website anonymous request bhejti hai. Data safe hai
  kyunki token ke bina script kuch read/write nahi karta.
- \`/exec\` URL aur TOKEN kisi ko na dein — inse sheet me row daali ja sakti hai.

---

## Poora code (${lineCount} lines)

\`\`\`javascript
${code}
\`\`\`
`;

fs.writeFileSync(outPath, doc);
console.log(`wrote ${path.relative(root, outPath)} (${lineCount} lines of code)`);
