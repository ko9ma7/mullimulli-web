# Visual fidelity ledger

Reference: `design/concept-reference.png`

## Comparison points

1. **Palette** — reference uses warm cream surfaces, dark forest green primary actions, muted tan borders. Implementation keeps the same hierarchy and temperature through CSS tokens.
2. **Header** — reference has a lightweight horizontal brand/nav/profile bar. Implementation preserves the same low-density shell and sticky behavior.
3. **Hero composition** — reference uses large left-aligned Korean headline, explanatory copy, two CTAs, and a pigeon illustration on the right. Implementation matches that composition and uses an Image Gen-derived pigeon crop as the primary hero asset.
4. **Courier rail** — reference shows horizontally repeated animal/object delivery cards. Implementation provides seven selectable couriers with speed, role, and failure probability, including a selected state.
5. **Right rail** — reference uses profile, friend list, and message/stat cards. Implementation keeps profile, last-location control, friend list, and delivery statistics in the same secondary rail.
6. **Responsive behavior** — the desktop two-column layout collapses to a single column and bottom navigation at tablet/mobile widths. Verified at 320, 375, 390, 430, 768, 1024, and 1440 px without document-level horizontal overflow.

## Intentional deviations

- The reference concept contains a geographic route/map panel. The implementation uses an abstract journey progress view instead of exposing exact friend coordinates on the client. This is a privacy-driven change.
- Small courier icons use platform emoji rather than additional raster illustrations to keep the GitHub Pages bundle dependency-free; the hero uses a generated branded illustration.
- The concept's exact font is not embedded. The implementation uses a Korean-capable system font stack to avoid external font requests and improve performance/privacy.
