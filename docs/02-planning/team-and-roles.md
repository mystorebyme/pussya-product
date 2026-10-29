# Team & roles

| Role | Kaun | Responsibility |
| --- | --- | --- |
| Product owner | Store owner (Tannu) | Priority, pricing, offers, final design approval |
| Tech lead / full-stack dev | 1 (AI-assisted) | Architecture, code, deploy, docs |
| Catalogue manager | Owner/staff | Product add, images, price, stock |
| Dispatch | Family/staff | Packing, AWB, status update |
| Support | Owner | WhatsApp, returns, COD confirmation |
| CA | External | GST filing, invoice format |

## Access matrix (Phase 1)

| Area | Owner | Catalog | Dispatch |
| --- | --- | --- | --- |
| Dashboard | ✅ | ✅ (read) | ✅ (read) |
| Orders status | ✅ | ❌ | ✅ |
| Products price/stock | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Audit logs | ✅ | ❌ | ❌ |

Phase 1 me ek hi login hai (owner). Phase 2 me staff accounts + RBAC implement hoga
(`docs/07-security/authorization-rbac.md`).

## Communication

- WhatsApp group: daily orders + issues
- Weekly: metrics review (revenue, AOV, COD %, returns)
- Release note har deploy par (`docs/11-maintenance/changelog.md`)
