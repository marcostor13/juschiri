# Jus Chiri — Claude Code Instructions

## Response Rules (Token Efficiency)
- No preambles: never start with "Sure!", "Great!", "Of course!", "I'll help"
- No closings: never end with "I hope this helps!", "Let me know if...", "Is there anything else?"
- No restating the task before solving it
- No Unicode decorations (→ ✓ ✅ 🔥) unless in UI strings already present in code
- No over-explanation: state result + why if non-obvious, nothing more
- Prefer targeted edits over full rewrites
- Read each file once per session; do not re-read unless changed
- Run `npm run build` to validate before marking work done
- User instructions always override these rules

## Project: Jus Chiri
React 19 + Vite 7 + Tailwind CSS 3 sneaker e-commerce. Peruvian market (prices in S/., Spanish UI). No backend — mock data only.

**Entry point:** `src/App.jsx` (555 lines, single-file monolith)
**Build:** `npm run build` → `dist/`
**Dev:** `npm run dev`

---

## Design System (MANDATORY — never deviate)

### Colors
| Token | Hex | Usage |
|---|---|---|
| `neon-green` / `#CCFF00` | Accent, CTA hover, badges, highlights |
| `black` / `#000000` | Primary text, borders, buttons, footer bg |
| `white` / `#FFFFFF` | Main background, card bg, modal bg |
| Gray scale | `gray-50` through `gray-500` | Subtitles, borders at rest, inputs |

**Rule:** Interactive elements go `black → neon-green` on hover, never the reverse on primary CTAs.

### Typography
| Class combo | Role |
|---|---|
| `font-black italic uppercase tracking-tighter` | Brand name "JUS CHIRI®" only |
| `font-black uppercase tracking-tighter leading-[0.85]` | Hero headings |
| `font-bold uppercase tracking-wider` | Buttons, labels |
| `font-mono text-sm uppercase` | SKUs, prices, metadata, monospaced UI text |
| `font-mono text-xs text-gray-500` | Secondary labels, timestamps |

**Rule:** Never use `font-serif` or `font-light`. Never lowercase brand elements.

### Borders & Spacing
- All interactive borders: `border-2 border-black` (active) / `border-2 border-gray-200` (rest)
- No `rounded-*` except `rounded-full` for circular elements (success checkmark)
- Consistent hover: `hover:border-black hover:text-black`
- Accent divider: `border-t-8 border-neon-green` (footer top)
- Grid dividers: `border-r-2 border-b-2 border-gray-100` with overlap trick `-mr-[2px] -mb-[2px]`

### Buttons
```
Primary:   bg-black text-white border-2 border-black font-bold uppercase hover:bg-neon-green hover:text-black
Secondary: bg-white text-black border-2 border-black font-bold uppercase hover:bg-gray-100
Disabled:  opacity-50 cursor-not-allowed
Active filter: bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(204,255,0,1)] -translate-y-1
```

### Animations
| Class | Usage |
|---|---|
| `animate-marquee` | Announcement banner only |
| `animate-fade-in` | Step transitions inside modal |
| `animate-fade-in-up` | Modal entrance, toast notifications |
| `transition-all duration-200` | Card hover states |
| `transition-colors` | Button/icon color changes |
| `transition-transform duration-700 ease-in-out` | Product image zoom |

### Layout
- Max width: `max-w-[1920px]` for nav/main, `max-w-7xl` for footer content, `max-w-4xl` for CTA sections
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` for product grid
- Z-index layers: marquee `z-[60]` → navbar `z-40` → filter bar `z-30` → modal `z-[100]` → toast `z-[70]`
- Modal: `max-w-2xl` centered, `border-2 border-black` on desktop, full-screen mobile

### Selection Color
```css
selection:bg-neon-green selection:text-black  /* applied on root div */
```

### Images
- Product cards: `aspect-[4/5]` with `object-cover`
- Hero: full-height grid, image `grayscale contrast-125` default, `grayscale-0 scale-105` on hover
- Always include `alt` attributes

---

## Component Patterns

### New Component Checklist
- [ ] Follows color tokens above (no hardcoded hex unless #CCFF00 shorthand)
- [ ] Uses `font-mono` for all numerical/data display
- [ ] Borders use `border-2` minimum
- [ ] Has `transition-colors` or `transition-all` on interactive elements
- [ ] Uppercase text for labels, buttons, headings
- [ ] No emojis in production UI (except existing 🔒 in payment step)

### Adding Products
Follow the `PRODUCTS` array shape: `{ id, name, brand, price, category, image, sku, isNew }`

### Adding Categories
Update both `PRODUCTS[].category` and the `CATEGORIES` array.

---

## Agent System

### available-agents
- **design-agent**: Enforces design system rules. Use when adding UI components or modifying styles.
- **build-agent**: Runs `npm run build`, checks for errors, validates bundle. Use before any deploy.
- **content-agent**: Updates mock data (PRODUCTS, copy, Spanish text). Does not touch UI logic.
- **deploy-agent**: Handles Netlify deployment. Runs build → validates → deploys via `netlify deploy --prod`.

### Agent Rules
- design-agent runs implicitly on any CSS/JSX change — validate against Design System section
- build-agent must succeed before deploy-agent starts
- content-agent never modifies component structure, only data arrays and string literals

---

## Netlify Deployment
Config: `netlify.toml` in project root.
Deploy command: `npm run build`
Publish: `dist`
SPA redirects: `_redirects` in `public/`
Node: 20.x

To deploy manually: `netlify deploy --dir=dist --prod`
