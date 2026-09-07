# Cue design system

An editorial quiz magazine for curious young people. Open paper surfaces, expressive but readable headings, real quiz imagery, cobalt navigation and a small lime accent. Geist is retained with Japanese and Chinese system fallbacks; no remote font dependency.

## Shared tokens
`tokens.css` is the source of truth for colors, 8px spacing unit, 16px media radius and typography. `app/globals.css` exposes existing Tailwind brand utilities through these variables, so existing learning pages keep the same brand. Dark mode uses the OS preference. Primary text, focus outlines and controls retain contrast in both modes.

## Page families
- Discovery: sidebar, two-column introduction featuring a real eligible quiz, three-column collection. Below 1024px the introduction stacks; below 768px filters move into the main flow.
- Collection: open heading and the same media grid.
- Watch: shared header/footer, readable wrapping titles, existing answer and feedback states.
- Other application routes: shared surfaces, navigation and brand tokens; functional page layouts retained.

## Interaction and content
Every feature and primary CTA points to an existing quiz. The default spotlight prefers a quiz for ages 13+ from the current eligible results, with a fallback to the first result. Filters, search and study modes preserve their behavior. Age selection is a labeled native select. English, Japanese and Simplified Chinese introductory/footer copy is defined together. The hero is hidden while searching or using a specific subject/study mode.

Use visible keyboard focus, minimum 16px mobile gutters, reduced-motion support, and natural heading line breaks. Do not add decorative dashboards, invented statistics or fake featured content. Existing quiz artwork remains real content; its quality varies by record.

## Progress
[Done] Shared visual tokens, home introduction, navigation, compact filters, quiz grids, footer and wrapping quiz titles.
[Next] Review authenticated study dashboards with representative learning histories.
[Later] Extend editorial treatment to administrative authoring screens.
