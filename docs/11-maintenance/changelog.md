# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/) + semver.

## [Unreleased]

- Homepage festive (Diwali 2026) hero copy refresh
- `orders/[orderNumber]` ko `@/lib/orders` par port karna (drizzle import remove)

## [1.0.0] — 2026-10-24

### Added
- Storefront: home, 9 collections PLP, 287 PDP (SSG), search, cart, checkout, order tracking,
  policies, about/contact/FAQ/size guide, sitemap/robots.
- Admin: login + 15 routes (dashboard, orders, products, inventory, collections, customers,
  reports, coupons, reviews, settings, audit logs, staff, banners).
- API v1: products, collections, catalog meta, orders (+idempotency), status transitions,
  dashboard, payment link, Razorpay webhook.
- Packages: types, validation (zod), api-client, ui, config.
- Database: prisma schema, SQL constraints, seeds, backup/restore scripts.
- Docs 00–11, agent guides, 8 project skills.
- Infra: Dockerfiles, compose, CI workflow, turbo tasks.

### Known limitations
- Orders JSON persistence (single instance).
- Prepaid flow needs live Razorpay keys.
- Images hotlinked from Shopify CDN (mirroring pending).
- Storefront images may not render in restricted preview sandboxes (CDN SSL).

## Versioning

- `0.x` pre-launch, `1.x` live store, patch = fixes only, minor = features.
