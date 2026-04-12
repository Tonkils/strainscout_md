# QA Standards — StrainScout MD

## Accessibility: WCAG 2.1 AA

| Criterion | Requirement |
|-----------|-------------|
| Color contrast | 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold) |
| Keyboard navigation | All interactive elements reachable and operable via keyboard |
| Focus indicators | Visible focus ring on all focusable elements |
| Heading hierarchy | Logical h1 → h2 → h3 order, one h1 per page |
| Images | All `<img>` elements have descriptive `alt` text; decorative images use `alt=""` |
| Form labels | All inputs associated with a visible or screen-reader label |
| Error messages | Errors identified in text, not color alone |
| Link purpose | Link text describes destination — no "click here" or "read more" alone |

## Data Integrity

| Check | Standard |
|-------|----------|
| Price accuracy | Scraped prices must match source within $0.50 tolerance |
| Category accuracy | Product category must match name-based classification or manual override |
| Strain deduplication | No duplicate strain names within the same dispensary |
| Last-updated timestamp | All catalog entries must have a `lastScraped` date within 14 days |
| Grade assignment | Grade A = verified type + effects + terpenes; Grade B = verified type only; Grade C = name only |

## Code Quality

| Standard | Rule |
|----------|------|
| TypeScript | Zero type errors on `npm run check`; no untyped `any` without comment |
| Test coverage | All new tRPC procedures have at least one happy-path and one error-path test |
| Component size | Components over 400 lines should be reviewed for split opportunities |
| State management | Prefer React Query cache over local `useState` for server data |
| Dead code | Remove unused imports, variables, and commented-out code before committing |

## Performance Budgets

| Metric | Target |
|--------|--------|
| Strain detail page LCP | < 2.5 seconds on 4G mobile |
| Homepage initial load | < 3 seconds on 4G mobile |
| Catalog JSON parse | < 500ms (minified JSON, parsed once and cached) |
| tRPC query response | < 300ms for simple queries, < 1000ms for aggregations |
| Bundle size increase | Any PR that adds > 50KB to the client bundle requires justification |

## Per-Phase Checklists

### After every frontend change
- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run format` applied (Prettier)
- [ ] Mobile viewport (390px) tested visually
- [ ] No hardcoded colors outside of `index.css` theme tokens

### After every backend change
- [ ] `npx vitest run` passes
- [ ] New procedure has input validation (Zod)
- [ ] New procedure uses correct authorization tier
- [ ] No raw SQL string concatenation

### Before any deploy
- [ ] `npm run build` passes clean
- [ ] Static output spot-checked on 3 strain pages and 1 dispensary page
- [ ] Category filter working on `/compare`
- [ ] Email signup form submits without error
