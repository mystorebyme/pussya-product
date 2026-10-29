# Accessibility

Target: **WCAG 2.1 AA** for customer-facing pages.

## Requirements

| Area | Rule |
| --- | --- |
| Contrast | body text ≥ 4.5:1, large text ≥ 3:1. Maroon `#862222` on white = 8.4:1 ✅ |
| Keyboard | sab controls Tab se; focus visible (2px outline, offset 2) |
| Forms | har input ka `<label>`, error `aria-describedby`, `aria-invalid` |
| Images | sab `<img alt>`; decorative `alt=""` |
| Headings | ek H1 per page, skip nahi |
| Drawer/modal | `role=dialog`, `aria-modal=true`, focus trap, Esc, return focus |
| Motion | `prefers-reduced-motion` par animations off |
| Zoom | 200% par layout na toote (no fixed heights on text blocks) |
| Tap targets | ≥ 44×44px |
| Language | `<html lang="en-IN">` |
| Announcements | cart add par `aria-live="polite"` ("Added to bag") |

## Testing

1. Keyboard-only pass (Tab/Shift-Tab/Enter/Esc) — home, PLP, PDP, cart, checkout.
2. axe DevTools: zero critical issues.
3. VoiceOver (iOS) / TalkBack: PDP → add to bag flow.
4. Screen reader friendly order status timeline (`<ol>`).

## Known gaps (tracked)

- Custom size selector buttons `aria-pressed` use karte hain, radio-group semantics Phase 2.
- Video content nahi hai (captions N/A).
