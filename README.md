# Adiverse

**Your knowledge. Your universe.**

A personal academic workspace for college students. Adiverse helps you organise subjects, map concepts visually, connect related ideas, and track your understanding over time.

---

## Phase 1: Landing Page

The landing page is complete and self-contained. No build step is needed.

### Running locally

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
# Python
python -m http.server 3000

# Node (npx)
npx serve .
```

Then visit `http://localhost:3000`.

---

## File Structure

```
adiverse/
├── index.html           -  Landing page
├── css/
│   ├── tokens.css       -  Design tokens (colours, type, spacing, shadows)
│   ├── base.css         -  Reset, base typography, shared utilities, buttons
│   ├── landing.css      -  Section-specific landing page styles
│   └── responsive.css   -  Responsive breakpoints and reduced-motion overrides
├── js/
│   └── landing.js       -  Nav scroll state, mobile menu, reveals, SVG animation
├── assets/
│   └── icons/           -  Icon assets (reserved for future phases)
└── README.md
```

---

## Design System

Colours, spacing, typography, shadows, and radius values are defined as CSS custom properties in `css/tokens.css`. All other files reference these tokens. No values are hardcoded in component styles.

**Palette:**
- Background: `#F5F1E8` (warm parchment)
- Forest green: `#34463A` (primary actions, root nodes)
- Sage family: `#DCE5D5` / `#A6B79B` / `#687D62`
- Earthy accent: `#C69B7B` (cross-connections, highlights)
- Text: `#292F29` / `#7A8C78` (muted)

**Fonts:** Cormorant Garamond (serif) + DM Sans (sans-serif), loaded from Google Fonts.

---

## Accessibility

- Semantic HTML5 with proper heading hierarchy (h1 → h2 → h3)
- All interactive elements are keyboard accessible
- Visible `:focus-visible` ring on all controls
- `aria-label`, `aria-expanded`, `aria-controls` on navigation
- SVG illustrations have `role="img"` and `aria-label` or `aria-hidden="true"` as appropriate
- `prefers-reduced-motion` is respected  -  all animations and transitions are disabled when the preference is set
- Colour contrast meets WCAG AA standards across all text combinations

---

## Phase Boundaries

Phase 1 covers the landing page only.

The following are **not** implemented and must not be assumed:
- Knowledge universe graph engine (editing, persistence, layout)
- Academic workspace
- Notes and resource management
- Assignments and deadline tracking
- Revision workflows
- Authentication or backend services

Future phases will be authorised separately.
