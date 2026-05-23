---
name: linkedin-ui-design
description: 'Design guidelines and UI patterns for the LinkedIn Chrome extension popup. Use when adding new UI elements, restyling existing components, choosing colors, adding buttons or dropdowns, creating badges, designing sections/panels, or ensuring consistency with LinkedIn''s native look and feel. Triggers on: new UI, restyling, button style, popup layout, badge color, color picker, dropdown, collapsible section, SVG icon, LinkedIn style.'
---

# LinkedIn Extension — UI Design Guidelines

## Core Philosophy

The popup should feel native to LinkedIn — clean, minimal, dark text on white, blue used sparingly only for primary actions. No heavy shadows, no bright accent borders, no emojis.

---

## Color Tokens

| Token | Value | Use |
|-------|-------|-----|
| LinkedIn blue | `#0a66c2` | Primary action buttons only |
| Dark text | `#191919` | Headings, body text |
| Muted text | `#555` | Hints, secondary labels |
| Border (default) | `#666` | Pill button outlines |
| Border (strong) | `#333` | Hover state for pill buttons |
| Hover bg | `#f3f3f3` | Neutral hover for ghost elements |
| Blue hover bg | `#e7f3ff` | Hover for blue-tinted items |
| Divider | `#f0f0f0` | Horizontal rules inside dropdowns |
| Danger text | `#b91c1c` | Destructive actions (text only, not bg) |
| Danger hover bg | `#fde8ee` | Hover for danger items |

---

## Typography

- **Font family**: inherit (system UI / LinkedIn's stack)
- **Section headings** (`.settings-title`): `13px`, `font-weight: 700`, `color: #191919` — dark, NOT blue
- **Body / labels**: `13px`, `color: #333`
- **Hints**: `11px`, `color: #555`, italic or normal

---

## Buttons

### Primary (Save, confirm)
```css
border-radius: 16px;
padding: 7px 18px;
background: #0a66c2;
color: white;
font-size: 13px;
font-weight: 600;
border: none;
```
Hover: `background: #004182`

### Secondary / Ghost (Cancel, neutral)
```css
border-radius: 16px;
padding: 7px 18px;
background: transparent;
border: 1px solid #999;
color: #444;
```
Hover: `background: #f0f0f0`

### Small variant (`.btn-sm`)
```css
padding: 5px 14px;
font-size: 12px;
```

### LinkedIn-native pill (More, + Add — matches LinkedIn's own secondary buttons)
```css
border-radius: 999px;
border: 1px solid #666;
background: transparent;
color: #191919;
font-weight: 600;
```
Hover: `background: #f3f3f3; border-color: #333`

**Rules:**
- No icons inside pill buttons (plain text label only)
- Blue (`#0a66c2`) border/color only for primary actions, not for secondary/pill buttons
- Low-priority actions (export, import, clear) go behind a "More" dropdown, not as standalone buttons

---

## Dropdowns (overflow menus)

Use for actions that are secondary or potentially destructive.

```
[More]  ← pill trigger, no icons, no chevron
  ↑
┌──────────────────┐
│ ↓ Export data    │
│ ↑ Import data    │
│ ──────────────── │
│ 🗑 Clear all     │  ← red text
└──────────────────┘
```

- Opens **upward** (`bottom: calc(100% + 6px)`) — popup has limited vertical space
- White bg, `border-radius: 8px`, `box-shadow: 0 4px 16px rgba(0,0,0,0.13)`
- Each item: `padding: 10px 14px`, `font-size: 13px`, SVG icon + label
- Destructive item: `color: #b91c1c`, hover `#fde8ee`, separated by `<hr class="dropdown-divider">`
- Close on outside click; use `stopPropagation` on the menu itself

---

## Collapsible Sections

```html
<div class="categories-header">
  <button class="categories-toggle" aria-expanded="false">
    <svg class="chevron">▾</svg>
    <span>Section Title</span>
  </button>
  <button class="btn-add-category">+ Add</button>
</div>
<div id="categoriesCollapsible" class="hidden">...</div>
```

- Collapsed by default (`aria-expanded="false"`, content has class `hidden`)
- Chevron rotates 180° when expanded via CSS: `[aria-expanded="true"] .chevron { transform: rotate(180deg) }`
- Transition: `transform 0.2s ease`

---

## Badge Palette

The `BADGE_PALETTE` array is defined **identically** in both `popup.js` and `role-highlighter.js` — keep in sync when changing.

16 entries, each:
```js
{ text: '<hex>', bg: '<light tint>', bg2: '<slightly darker tint>', border: '<same as text>' }
```

- Badges use `linear-gradient(135deg, bg 0%, bg2 100%)` for background
- Border: `1.5px solid border`
- Color picker chips use `linear-gradient(135deg, border 0%, bg 100%)` (vivid → light) so each hue is visually distinct in the picker

---

## Inline Swatch Color Picker

Color is changed by clicking a category's color swatch, **not** inside the edit form.

- Swatch button: 18×18px, gradient matching the badge, `border-radius: 4px`, `cursor: pointer`
- Clicking opens a `.swatch-picker` panel inserted directly after the `.category-row` in the DOM
- Panel shows a 8-column chip grid; selected chip gets `outline: 2.5px solid #1e293b; outline-offset: 2px`
- Panel closes on outside click or when the edit form opens/closes

---

## SVG Icons

- All icons are inline SVG, never emoji or Unicode symbols
- Use `stroke="currentColor"` so they inherit text color
- Common sizes: `14×14` for action items, `16×16` for row actions, `11×11` for chevrons
- `aria-hidden="true"` on all decorative icons
- Icon style: `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`, `fill: none`
  - Exception: filled icons (dots) use `fill="currentColor"`, `stroke="none"`

---

## Data Visualisation (Invitation Stats)

- Use inline SVG bar charts, not tables or third-party libs
- 8 bars: chronological left→right, current week rightmost and highlighted (`#0a66c2`), older bars lighter (`#93c5fd`)
- Y-axis: auto-scale with "nice" intervals; label count ≤ 5 ticks
- No external chart dependencies

---

## Spacing Conventions

| Element | Value |
|---------|-------|
| Between checkboxes | `margin-bottom: 10px` |
| Between section title and first item | `margin-bottom: 8px` |
| Between form hint and action buttons | `margin-top: 6px` on `.category-form-actions` |
| Between badge color chips | `gap: 6px` |
| Popup max-width | `360px` (set in manifest / popup.html body) |
