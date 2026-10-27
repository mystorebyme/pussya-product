# Security tests

Automated probes:

```bash
bash tests/security/headers.sh          # headers + guards
npm run test:integration                # auth, webhook signatures, validation
grep -rn "sk_live\|rzp_live\|BEGIN PRIVATE KEY" --exclude-dir=node_modules . || true
npm audit --omit=dev
```

Manual checklist before every release: `docs/08-testing/security-testing.md` (12 items — price tampering,
qty abuse, missing token, bad transitions, cookie forgery, unsigned webhook, XSS in search, path traversal,
rate limiting, error leakage, PII masking, header presence).

Threat model and mitigations: `docs/07-security/threat-model.md`.
