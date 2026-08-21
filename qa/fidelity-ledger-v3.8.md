# v3.8 Fidelity Ledger

Reference concepts:
- `design/concept-v3.8-desktop.png`
- `design/concept-v3.8-mobile.png`

Implementation screenshots:
- `qa/desktop-v3.8.png`
- `qa/mobile-v3.8.png`

## Comparison points

1. **Send workspace hierarchy** — reference combines recipient, message, courier selection and final send summary in one surface. Implementation now uses one `send-workspace` with the same 1→2→3 workflow instead of a large standalone distance-service section.
2. **Courier density** — reference shows a short courier rail and a secondary “view all” action. Implementation defaults to 6 recommended couriers and expands to all 50 only on request.
3. **Countdown information** — reference prominently displays D-Day, remaining time and exact arrival date/time. Implementation adds all three to pre-send summary and every active journey card.
4. **Desktop composition** — reference uses a two-column composer/courier workspace with profile rail. Implementation matches this structure above 900px and retains the existing profile/friends sidebar.
5. **Mobile composition** — reference collapses to a single guided flow with bottom navigation. Implementation stacks recipient → message → courier → countdown → send, with no page-level horizontal overflow at 320/375/390/430px.
6. **Hero treatment** — reference uses a shorter editorial hero so the send workflow enters the first/second viewport quickly. Implementation reduces hero height and keeps the existing generated pigeon asset rather than replacing it with the reference raster screen.
7. **Journey cards** — reference shows compact progress cards with countdown panels. Implementation uses progress %, exact dates, D-Day and remaining time in a dedicated right-side countdown panel.

## Intentional deviations

- Courier artwork remains the project’s existing emoji/Unicode courier system rather than introducing 50 new raster character assets. This preserves the existing catalog/data-driven architecture and keeps the repository lightweight.
- The right profile sidebar retains the project’s existing account/privacy controls instead of the concept’s decorative friend count/list treatment.
- The implementation keeps the existing service copy and backend behavior; only information architecture and visual presentation were changed.

## QA

- JavaScript syntax validation: passed.
- 50 courier rules synchronized from `data/catalog.json`: passed.
- No page-level horizontal overflow: 320, 375, 390, 430, 768, 1024, 1440px.
- Draft survives courier changes: passed.
- Default courier count 6 / expanded courier count 50: passed.
- D-Day, remaining time and arrival date visible: passed.
- Send button and confirm flow create a journey: passed.
- Browser console/page errors in QA: 0.
