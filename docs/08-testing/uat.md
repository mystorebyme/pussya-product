# UAT (user acceptance testing)

Owner ke saath, real device (phone), production-like data.

## Setup

- Staging URL + admin URL + test order.
- Owner ko 30 min walkthrough; wo khud clicks kare, hum note karein.

## Scenarios

| # | Actor | Steps | Pass criteria |
| --- | --- | --- | --- |
| 1 | Customer (mobile) | Instagram link → home → Anarkali collection | 3s ke andar grid, images sahi |
| 2 | Customer | Product kholo → size M → add to bag | drawer khula, subtotal sahi, size yaad raha |
| 3 | Customer | Checkout COD Rs. 2,519 | order number mila, page reload par bhi dikhe |
| 4 | Customer | Rs. 4,500 order COD try | COD blocked, prepaid option clear |
| 5 | Customer | Prepaid pay → Razorpay → success | order `paid`, email/WhatsApp mila |
| 6 | Customer | Order page par status dekho | timeline sahi |
| 7 | Owner | Admin login | dashboard par aaj ke orders |
| 8 | Owner | Order `confirmed` karo | customer page par status update |
| 9 | Owner | Product price badlo | storefront par naya price (revalidate ke baad) |
| 10 | Owner | Stock 0 karo | PDP par "Sold out" |
| 11 | Owner | Settings me support number badlo | footer/order page update |
| 12 | Owner | Audit log kholo | sab actions listed |

## Sign-off

| Item | Owner confirm |
| --- | --- |
| Prices exact (5 random products vs store) | ☐ |
| Images sahi product ki | ☐ |
| Sizes correct | ☐ |
| Checkout 2 min me complete | ☐ |
| Admin se order manage | ☐ |
| Mobile par trust-building (policies dikh rahi) | ☐ |

Defect log: `tests/uat-notes.md` (date, scenario, severity, status).
