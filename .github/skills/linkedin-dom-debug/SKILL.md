---
name: linkedin-dom-debug
description: 'Debug and fix broken LinkedIn DOM selectors in this extension. Use when role badges stop appearing, card selectors return 0 results, or after LinkedIn updates its UI. Triggers on: selectors broken, badges not showing, people page not working, LinkedIn changed DOM, update card selectors.'
argument-hint: 'Optional: describe what stopped working (e.g. "role badges not showing")'
---

# LinkedIn DOM Selector Debugging

## When to Use
- Role badges stopped appearing on the People page
- `getPeopleProfileCards()` returns 0 results
- LinkedIn pushed a UI update and the extension silently breaks
- You want to verify selectors after a LinkedIn redesign

## Key Facts (Current as of May 2026)
| What | Selector | Notes |
|------|----------|-------|
| Person card | `.artdeco-entity-lockup--size-7` + has `a[href*="/in/"]` | `--size-3` = company card (false positive), `--size-1` = logo widget |
| Anonymous card | `.artdeco-entity-lockup` — **no** `a[href*="/in/"]` link | "LinkedIn Member" — name is always the first text in `textContent` |
| Job title element | `.artdeco-entity-lockup__subtitle` | Returns full title string, e.g. "HR Professional \| Recruitment..." |
| People page URL | `/company/{slug}/people` | Extension only runs here |

## Debugging Procedure

### Step 1 — Confirm the extension is running
Open DevTools → Console and check for errors from `content.js`. The extension produces no console output when healthy.

### Step 2 — Run the selector diagnostic
Go to a LinkedIn `/company/{slug}/people` page, scroll until employee cards with names and photos are visible, then paste [./scripts/diagnose.js](./scripts/diagnose.js) into the DevTools Console.

### Step 3 — Interpret the output

**If "artdeco-entity-lockup with /in/ link: 0"** → Cards not rendered yet. Scroll down further and re-run.

**If cards found but title selector fails** → LinkedIn renamed the subtitle class. Check "First person lockup outer HTML" and look for the `div` or `span` containing the job title text. Update `getJobTitleElement()` in `content.js`.

**If cards found with 0 person lockups** → The size class changed (was `--size-7`). Check "First 3 person lockup text lines" and find the correct size variant. Update `getPeopleProfileCards()` in `content.js`.

### Step 4 — Update `content.js`

Two functions to fix:

**`getPeopleProfileCards()`** — update the size class:
```js
const candidates = document.querySelectorAll('.artdeco-entity-lockup--size-7'); // ← change size
const cards = Array.from(candidates).filter(el => el.querySelector('a[href*="/in/"]'));
```

**`getJobTitleElement()`** — update the first (most specific) selector:
```js
const selectors = [
  '.artdeco-entity-lockup__subtitle', // ← replace if class renamed
  '[class*="subtitle"]',              // partial-match fallback
  '.t-14',
  '.t-normal',
];
```

### Step 5 — Verify
Reload the extension at `chrome://extensions`, reload the LinkedIn People page, and confirm badges appear next to recruiter/director/founder roles.

## Watch Out For
- **Company recommendation cards**: `--size-3` lockups contain company names + "X followers". Always filter by `a[href*="/in/"]` to exclude them.
- **Anonymous "LinkedIn Member" cards**: These have no `/in/` link, so any selector that filters by `a[href*="/in/"]` will silently skip them. Use `textContent.replace(/\s+/g,' ').trim().toLowerCase().startsWith('linkedin member')` on all `.artdeco-entity-lockup` elements to identify them.
- **Bar graph / insights carousel**: `.org-people__carousel-container` contains location/function analytics — not person cards. Ignore it.
- **Lazy loading**: LinkedIn renders cards as you scroll. If the diagnostic finds 0 cards, scroll down first.
- **Obfuscated class names** (e.g. `bqZqkrNZWYVFnBtWDyprdSfnZYBBgOqbxjqo`): These change on every deploy. Never use them as selectors. Prefer structural selectors (`.artdeco-entity-lockup`, `li`) or `textContent`-based matching.
- **CSS injection won't reliably hide cards**: LinkedIn's stylesheet can override `display:none` from injected CSS even with `!important`. Use `element.style.setProperty('display','none','important')` as an inline style instead — it takes precedence over all author stylesheets.
- **`chrome.storage` is not accessible from DevTools console**: Running `chrome.storage.local.get(...)` in the DevTools console throws `TypeError: Cannot read properties of undefined`. Check storage values from within the extension's background/popup context, or use the Application panel → Storage → Extension storage in DevTools.
