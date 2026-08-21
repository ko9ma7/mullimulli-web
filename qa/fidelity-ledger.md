# UI Fidelity / QA Ledger v2

Reference concept: `/mnt/data/a_clean_flat_pastel_web_app_landing_dashboard_ui.png`

Implementation screenshot: `qa/desktop-v2.png`

Playwright fallback was used because direct localhost/file navigation is blocked by the execution environment. The real HTML/CSS/JS was loaded into Chromium with a localStorage shim for UI verification.

## Comparison points

1. **Brand / palette** — cream background, dark green primary, rounded white surfaces and soft borders match the concept direction.
2. **First viewport** — large two-line hero copy on the left and messenger-pigeon illustration on the right are preserved.
3. **Navigation** — send / journey / inbox / friends / explanation remain visible in the desktop top bar and collapse to a fixed mobile bottom bar.
4. **Courier rail** — compact illustrated courier cards, distance filters, ETA, minimum wait and success rate are visible without turning the interface into a generic table.
5. **Friend state** — unlike the earlier sample-heavy version, the sidebar explicitly shows friend count 0; no fake users are automatically populated.
6. **Demo recipient** — a separate admin test mailbox is visually distinguished from real friends and provides 500m–12,000km distance presets.
7. **Responsive behavior** — Chromium checks at 1440px and 390px produced no document-level horizontal overflow.
8. **Timing** — default 25km pigeon ETA is about 6 hours; 1000km recommended delivery defaults to the mail train at about 1 day. Demo acceleration is 1×.
9. **Console** — no page errors or console errors in the tested send flow.

## Intentional deviations

- The implementation exposes more filtering and timing detail than the visual concept because the user requested a substantially larger distance-based courier catalog.
- The concept's decorative Docs cards were not added to the primary product screen; repository/site documentation is delivered as actual project files instead.
- Courier art uses native emoji for performance and zero external asset dependency; the hero uses the generated pigeon artwork.
