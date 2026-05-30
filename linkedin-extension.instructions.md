---
description: "Use when developing the LinkedIn People Page Tracker extension. Enforces minimal, non-intrusive UI, LinkedIn-only scope, and user data control principles."
name: "LinkedIn Extension Guidelines"
applyTo: "**/*.js,**/*.css,manifest.json"
---

# LinkedIn People Page Tracker — Development Guidelines

> This extension has grown beyond basic company tracking. It now includes role highlighting on People pages, anonymous-profile hiding, per-week invitation/withdrawal counting with a bar chart, a Connect-button promoter on profile pages, reusable search strings inserted via context menu, and a context menu shortcut to add selected text to a keyword category. All features remain personal-use only, non-intrusive, and local-only.

## Core Principles

This extension is intentionally **minimal and focused**. Each feature must serve a single purpose and avoid visual clutter.

### 1. Badge Placement: One Per Company
- ✅ **Company profile header** (h1 name only) — when visiting `/company/{slug}/` or subpaths
- ❌ Do not badge navigation tabs (Home, About, Posts, Jobs, People, Insights)
- ❌ Do not badge company links in search results or listings
- ❌ Never duplicate badges on the same company within a single page view

**Rationale**: Users should instantly see if they've visited a company's People page when viewing that company's profile. Elsewhere would create visual noise.

### 2. LinkedIn-Only Scope
- Extension operates **only** on `https://www.linkedin.com/*`
- Do not extend to other job boards (Indeed, Glassdoor, ZipRecruiter, etc.)
- Use manifest `host_permissions` narrowly: `"https://www.linkedin.com/*"` only

**Rationale**: LinkedIn's DOM structure and navigation patterns are unique; supporting multiple sites requires site-specific selectors and logic per platform.

### 3. Trigger: `/people` Path Visits
- Auto-save company when URL matches `/company/{slug}/people/` (case-insensitive)
- Do not require manual marking or confirmation
- Do not trigger on other company page visits (e.g., `/company/{slug}/`, `/company/{slug}/about/`)

**Rationale**: The People page is the specific page users want to track; other pages don't indicate intent to review employees.

### 4. User Data Control
- **Export**: JSON file with version, export date, all tracked companies (slug, name, firstSeen, visitCount)
- **Import**: Merge imported companies with existing data (don't overwrite; preserve visit counts)
- **Clear**: Confirm before wiping all data
- **Storage**: `chrome.storage.local` only; no cloud sync needed

**Rationale**: Users own their data and should be able to back it up and restore it without breaking existing history.

### 5. Role Highlighting: People Pages Only
- Color-coded badges are injected into person cards only on `/company/{slug}/people/` pages
- Each category maps to one of 8 fixed color slots — do not add dynamic palette generation
- Categories and the enabled flag are stored together under `highlightingSettings` in `chrome.storage.local`
- Seed `DEFAULT_CATEGORIES` only if no categories exist yet; never overwrite user-customized data
- Keyword matching: try `RegExp(kw, 'i')` first; fall back to plain substring if the pattern is invalid

**Rationale**: Role information is only meaningful in the context of a company's People page. Injecting badges elsewhere adds noise without context.

### 6. Member Hider: Toggle-Controlled, Non-Destructive
- Mark anonymous cards with `data-lkd-unreachable` — never delete or move DOM nodes
- Hide/show by toggling `display:none` so the toggle is instantly reversible
- Store as `hideUnreachable` inside `memberHiderSettings` — its own storage key, separate from `highlightingSettings`

**Rationale**: Hiding is a preference, not a permanent filter. The user must be able to re-enable it without a page reload breaking anything.

### 7. Invitation Tracker: Count, Don't Intercept
- Record sends; never block, delay, or modify LinkedIn's invitation flow
- Deduplicate signals within a 5 s window using `_lastSendAt` — three paths (modal, direct Connect→Pending, toast) can all fire for the same invite
- Store counts under `invitationStats` keyed by ISO-week Monday date (UTC)
- Display only — no warnings, limits, or restrictions based on count

**Rationale**: The tracker is informational. It must never interfere with LinkedIn's own send flow or imply enforcement of a weekly cap.

### 8. Withdrawal Tracker: Attribute to Send Week, Not Current Week
- Only active on `/invitation-manager/` pages — do not attach listeners elsewhere
- Parse the relative date from the card ("Sent X weeks ago") to derive the ISO week the invite was originally sent; attribute the withdrawal to that week
- Two detection paths, deduped per queue item: card-removal check (800 ms timeout) fires first; "withdrawn" toast is the fallback
- Store counts under `withdrawnInvitationStats` keyed by ISO-week Monday date (UTC) — mirrors `invitationStats` schema
- Display only — never block or modify LinkedIn's withdraw flow

**Rationale**: Users need to correlate withdrawals with the weeks they were active, not with today's date.

### 9. Search Strings: Insert, Don't Type
- Store user-defined strings as `{ id, label, value }` objects under `searchStrings` in `chrome.storage.local`
- The background service worker builds an "Insert search string" context menu on editable fields; selecting an entry sends a `lkd-insert-string` message to the content script to perform the insertion and submit the search
- After inserting text, the content script dispatches `keydown`/`keypress`/`keyup` Enter events (with `composed: true`) on the input, then calls `form.requestSubmit()` on the nearest `<form>` as a fallback so LinkedIn's React handler picks it up reliably
- The background service worker also builds an "Add to keyword category" context menu on text selections; selecting a category appends the normalized (trimmed, lowercased) selection to that category's keyword list
- Rebuild both context-menu subtrees whenever `highlightingSettings` or `searchStrings` changes — use `chrome.contextMenus.removeAll()` before rebuilding to avoid duplicate items
- Guard concurrent rebuilds with a `_rebuildPending` flag

**Rationale**: Power users run the same Boolean or keyword strings repeatedly. A context menu eliminates copy-paste friction and keeps strings in sync across sessions.

### 10. Connect Promoter: Delegate, Don't Replace
- Never handle the invitation yourself — always delegate the click to LinkedIn's own button/item
- Case A (direct button): use CSS `order: -1`; add no JS at all
- Case B (More dropdown): inject a synthetic button but wire its click to the real dropdown item
- Scope all DOM queries to `<main>` to avoid matching action buttons on feed posts or sidebar cards
- Guard with `[data-lkd-connect-promoted]` to prevent duplicate injection on re-renders

**Rationale**: LinkedIn's invitation modal and direct-send logic are complex and change frequently. Delegating keeps the promoter immune to those changes.

## Technical Patterns

### URL Change Detection (Content Script)
- LinkedIn is a single-page app (SPA) — use `setInterval` to poll `location.href` every 500ms
- Do not rely on `popstate` or `hashchange` events
- Normalize slugs: lowercase, trim trailing slashes

### DOM Mutation & Badge Injection
- Use `MutationObserver` on `document.body` to detect newly rendered content
- Debounce injection (100ms) to batch mutations and avoid thrashing
- Cache seen companies in a `Set` for O(1) lookups
- Mark decorated elements with `data-lkd-seen` or `data-lkd-seen-header` attributes to prevent re-badging

### Role Highlighting & Member Hider (People Pages)
- Both run after the page settles; trigger via the same `MutationObserver`/debounce loop used for badge injection
- `RoleHighlighter.loadSettings()` seeds defaults on first run — check for existing categories before writing
- `MemberHider.run()` is idempotent: re-marking cards with `data-lkd-unreachable` is safe on repeat calls

### Invitation Counting
- Use a capture-phase `document.addEventListener('click', …, true)` so clicks are seen before LinkedIn's handlers
- The `_lastSendAt` dedup guard must be checked before `_recordSend()` and updated after it
- `getWeekKey(date)` always returns the Monday of the ISO week in UTC — use this consistently; never use local time

### Connect Promoter
- Run `ConnectPromoter.run()` after navigation changes (same SPA polling loop)
- Always scope `querySelector` to `<main>` to avoid false matches in sidebar and feed widgets
- The synthetic button must carry `data-lkd-connect-promoted` before insertion to prevent double-injection

### Storage Access
- Read/write directly via `chrome.storage.local` in content script (Manifest V3 allows this)
- Use the typed helpers in `storage-utils.js` (e.g. `getHighlightingSettings()`, `setSeenCompanies()`) instead of bare `chrome.storage.local.get/set` calls — this keeps key names centralised in `SK.*`
- Listen to `chrome.storage.onChanged` to sync badges across tabs in real-time
- Reload cache when other tabs write to storage
- Storage keys in use: `seenCompanies`, `highlightingSettings`, `memberHiderSettings`, `invitationStats`, `withdrawnInvitationStats`, `searchStrings`

## UI/Style Requirements

### Company Tracker Badge
- Green checkmark (`✓`) on green circular background (`#31a24c`)
- Compact: 20px diameter for inline badges, or 18px font for header badges
- Add tooltip with date: `Seen: {date}`
- Hover effect: darker green (`#2a8b40`) with subtle box-shadow

### Role Highlight Badges
- Pill shape, small font (≤11px), inline in the person card
- Color driven entirely by the 16-slot `BADGE_PALETTE` in `palette.js` — no freeform colors
- One badge per card maximum; first matching category wins

### No Intrusive Overlays
- Badges are inline or appended text, never modals or popups
- Popup only appears when extension icon is clicked
- Error messages (if any) show as temporary notifications (3s auto-dismiss)

## Code Organization

```
linkedin-extension/
├── manifest.json              # MV3 config, host_permissions, permissions (includes contextMenus)
├── background.js              # Service worker — context menu builder & keyword/string insertion
├── palette.js                 # Shared 16-slot BADGE_PALETTE constant
├── storage-utils.js           # SK.* key constants + typed getters/setters for all storage keys
├── content.js                 # URL watcher, badge injection; orchestrates all content modules
├── company-tracker.js         # CompanyTracker class — saves/loads seen companies and badges header
├── role-highlighter.js        # RoleHighlighter class — category management and badge injection
├── member-hider.js            # MemberHider class — hides anonymous "LinkedIn Member" cards
├── invitation-tracker.js      # InvitationTracker class — per-week send counting
├── withdrawal-tracker.js      # WithdrawalTracker class — per-week withdrawal counting
├── connect-promoter.js        # ConnectPromoter class — moves Connect to front of action bar
├── styles.css                 # All injected styles (tracker badge, role badges, connect promoter)
├── popup.html                 # Popup UI
├── popup.js                   # Popup logic (settings toggles, category/string CRUD, export/import/clear)
├── popup.css                  # Popup styling
├── popup-view.js              # PopupView class — coordinates popup UI rendering
├── category-list-view.js      # CategoryListView class — category list with drag-and-drop reorder
├── invitation-chart-view.js   # renderInvitationChart() — SVG bar chart for invitation/withdrawal stats
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

- **One concern per file**: Don't mix storage logic with DOM injection, or UI logic with file I/O
- **One class per feature file**: `role-highlighter.js` → `RoleHighlighter`, `member-hider.js` → `MemberHider`, etc.
- **`content.js` is the orchestrator**: it imports nothing but calls each class's `init()`/`run()` at the right time
- **`background.js` owns all context menu logic**: content scripts never call `chrome.contextMenus` directly
- **`storage-utils.js` is the single source of truth for key names**: always use `SK.*` constants, never bare string literals
- **No external dependencies**: Keep it vanilla JS (no jQuery, React, etc.)
- **Comments where logic isn't obvious**: URL regex, storage key names, debounce rationale

## Testing Checklist

Before marking a change as done:

**Company tracking**
- [ ] Visit a company's `/people` page → company saved to storage
- [ ] Reload the page → badge appears in company header (no duplication)
- [ ] Visit another company's People page → new company saved
- [ ] Open popup → count reflects total tracked companies
- [ ] Export → JSON file downloads with correct structure
- [ ] Import that file → count unchanged, visit counts preserved
- [ ] Clear All → confirm dialog appears, data wiped only on confirm
- [ ] Open two LinkedIn tabs → mark company in tab 1 → reload tab 2 → badge appears (storage sync works)

**Role highlighting**
- [ ] People page loads → role badges appear on matching cards
- [ ] Disable toggle in popup → badges disappear on next page visit
- [ ] Add a new category → new badges appear for matching titles
- [ ] Edit category keywords → updated matches reflect on reload
- [ ] Delete a category → its badges no longer appear
- [ ] Invalid regex keyword → falls back to plain text, no JS error

**Member hider**
- [ ] Enable toggle → "LinkedIn Member" cards hidden immediately on next run
- [ ] Disable toggle → hidden cards visible again
- [ ] Cards tagged `data-lkd-unreachable` are never removed from DOM

**Invitation tracker**
- [ ] Send invite via modal ("Send without a note") → count increments in popup
- [ ] Send via direct Connect button (no modal) → count increments once
- [ ] Only one count per invite (no double-count from toast + click)
- [ ] Week rolls over on Monday UTC → new week key appears in popup

**Connect promoter**
- [ ] Profile page with direct Connect button → Connect appears first (CSS order)
- [ ] Profile page with Connect only in More → synthetic button injected first
- [ ] Clicking synthetic button → normal LinkedIn modal or direct-send fires
- [ ] Navigating between profiles → no duplicate synthetic buttons

**Withdrawal tracker**
- [ ] Visit `/invitation-manager/` → withdraw an invite → count increments in correct ISO week column of chart
- [ ] Withdrawal attributed to the week the invite was sent (not current week)
- [ ] Card-removal path and toast fallback each count exactly once per withdrawal

**Search strings**
- [ ] Add a search string in popup → appears in "Insert search string" context menu on editable fields
- [ ] Select entry → text inserted at cursor in the focused field
- [ ] Delete a search string → no longer appears in context menu
- [ ] Edit label/value → context menu reflects updated label

**Context menu — Add to keyword category**
- [ ] Select text on LinkedIn → right-click → "Add to keyword category" → choose category → keyword added
- [ ] Added keyword is normalized (trimmed, lowercased)
- [ ] With no categories, submenu shows disabled "(No categories — create one in the popup)" item

## Amendments & Future Work

**Intended use**: Personal network building and research. Not for recruiters or bulk operations.

**Out of scope** (do not implement without explicit approval):
- Bulk tagging or labeling companies
- Filtering/searching for high-volume sourcing workflows
- Statistics or analytics for recruiting teams
- Syncing across devices (`chrome.storage.sync`)
- Other job sites
- Automated export to ATS (Applicant Tracking Systems) or recruiter tools
- Features designed for recruiter efficiency (batch operations, bulk messaging integration, etc.)
- Enforcing or warning about invitation limits based on tracked counts
- Automating or scripting the connection send flow

**Possible future enhancements** (only if user requests):
- Filter popup by date range
- Export to CSV format
- Keyboard shortcuts to mark companies

