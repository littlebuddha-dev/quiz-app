# Design verification — 2026-09-07

- Browser: Codex in-app browser, local Next.js development server.
- Visually checked: home at 1280px, Japanese mobile at 375px, English mobile at 414px, Chinese tablet at 768px, watch at 320px, new collection at desktop size.
- No document horizontal overflow at measured 320px, 375px, 414px and 768px widths.
- Functional checks: primary quiz CTA navigates to the featured record; hint reveals actual quiz guidance; English search returns the matching Moon quiz; locale query updates introductory content; collection route renders.
- Search now uses one result list instead of repeating the same match in recommended and latest sections.
- Browser error log: empty at final collection and home checks.
- TypeScript: passed. Targeted ESLint: no errors; existing Header navigation and WatchClient memoization warnings remain.
- Dark-mode tokens and reduced-motion styles are supplied; dark-mode visual QA and authenticated dashboards were not exercised in this guest session.

## Concept comparison
The implementation retains the reference's paper surface, ink headline, cobalt rail, lime directional accent, left-aligned introduction and three-column media list. The illustrative prism was replaced with a real eligible quiz's artwork and a working link, so the feature remains truthful. Existing quiz artwork varies in style and may contain embedded text.

## Design review
New discovery/footer components use no invented metrics, decorative dashboard panels or gradient typography. Navigation and content retain readable hierarchy and visible focus. Legacy study/admin components retain their existing layouts and some utility-level treatments; this is not a claim that every legacy route passes all Hallmark gates.

## Production validation
`npm run build -- --webpack` passed, including TypeScript, all 70 static-generation steps and route collection. Two pre-existing Next.js async-params type mismatches in channel and managed-upload routes were corrected. The default Turbopack build stalled without diagnostics and was stopped; Webpack was used for the completed production check. A subsequent `npx tsc --noEmit` and `git diff --check` passed.
