# ADR 0010 — No Google Fonts fetch at build time

**Status:** Accepted

## Context

`next/font/google` build ke waqt fonts fetch karta hai; restricted CI/sandbox me yeh fail hota hai
(SSL_ERROR_SYSCALL) aur build hi block ho jaata hai.

## Decision

`<link rel="preconnect">` + system/Georgia based stack, `font-display: swap`. Brand serif display ke liye
local-safe stack use kiya.

## Consequences

- Positive: build deterministic, zero font-JS, fast first paint.
- Negative: exact brand font agar licensed ho to Phase 2 me self-host karenge.
