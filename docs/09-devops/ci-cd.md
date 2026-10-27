# CI/CD

## Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml (summary)
jobs:
  verify:
    - actions/checkout
    - setup-node 22 + cache npm
    - npm ci
    - npm run typecheck
    - npm run build --workspace @noor/web
    - npm run build --workspace @noor/admin
    - npm run build --workspace @noor/api
    - npm test
  e2e:
    needs: verify
    - npx playwright install --with-deps chromium
    - npm run test:e2e
  deploy:
    needs: [verify, e2e]
    if: github.ref == 'refs/heads/main'
    - vercel deploy --prod (web)
    - vercel deploy --prod (admin)
    - render deploy hook (api)
```

## Gates

| Gate | Blocks merge |
| --- | --- |
| typecheck (3 apps) | ✅ |
| web build | ✅ |
| admin build | ✅ |
| api build | ✅ |
| unit tests | ✅ |
| e2e (main only) | warn on PR, block on main |
| `npm audit --omit=dev` high | warn |

## Branch strategy

- `main` = production.
- Feature branches → PR → squash merge (linear history).
- Hotfix branch → PR → merge → tag `v0.1.x`.

## Cache

- npm cache (`actions/setup-node` cache).
- Next build cache: `.next/cache` (Vercel handles; CI me optional).
- Playwright browsers cache.

## Failure playbook

Build fail → PR par fix, `main` par direct fix sirf deploy-breaking case me.
Deploy fail → previous deployment promote (Vercel instant rollback / Render previous deploy).
