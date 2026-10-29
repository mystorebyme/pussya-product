# ADR 0001 — npm workspaces monorepo

**Status:** Accepted

## Context

Project me web storefront, admin panel, API aur shared packages hain. pnpm sandbox me available nahi tha.
Turborepo-style task graph chahiye tha bina extra runtime ke.

## Decision

npm workspaces (`apps/*`, `packages/*`) + `turbo.json` task definitions. Root scripts `--workspace` flag se chalte hain.

## Consequences

- Positive: ek `npm install`, shared types direct import, ek CI pipeline.
- Negative: turbo binary optional hai; scripts root se sequential chalte hain.
- Revisit: jab build time 5 min cross kare, tab pnpm + remote cache.
