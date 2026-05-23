# LinkedIn People Page Tracker

A lightweight Chrome extension that automatically tracks LinkedIn companies whose People pages you've visited and marks them with a green checkmark in the company profile header.

**Who is this for?** 👥
- **Network builders** who want to keep track of which companies' talent pools they've explored
- **Career explorers** researching companies and their team composition
- **Job hunters** remembering which companies' employees you've connected with
- **Networking strategists** tracking follow-up on interesting companies

**Who is this NOT for?** 🚫
- **Recruiters** conducting bulk outreach or sourcing campaigns
- **Bulk data scrapers** trying to collect employee information
- **Automated hiring tools** or high-volume recruitment platforms

This extension is designed for **personal, manual networking** — not industrial-scale recruiting or data extraction.

## Features

✅ **Auto-tracking** — Company is saved automatically when you visit its `/people` page  
✅ **Company badges** — A green ✓ badge appears automatically in the company profile header and on company search result cards  
✅ **Role highlighting** — Color-coded badges on People pages by job title category (Recruiter, Director, Founder, etc.) — fully customizable  
✅ **Member hider** — Hide anonymous "LinkedIn Member" profiles from People pages with a toggle  
✅ **Invitation statistics** — Per-week bar chart of invitations sent and withdrawn; withdrawals are attributed to the week the invite was originally sent  
✅ **Connect promoter** — Moves the Connect button to the front of the action bar on profile pages  
✅ **Context menu** — Right-click selected text to add it to a keyword category; right-click any text field to insert a saved search string  
✅ **Data management** — Export tracked companies as JSON, import a backup, or clear all data  

## Installation

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/yourusername/linkedin-extension.git
   cd linkedin-extension
   ```

2. **Load the extension in Chrome**
   - Open Chrome and go to **`chrome://extensions/`**
   - Toggle **"Developer mode"** (top-right corner)
   - Click **"Load unpacked"**
   - Select the `linkedin-extension` folder
   - The green checkmark icon should appear in your toolbar

3. **Verify installation**
   - Navigate to any LinkedIn company's page
   - Check the company name in the header — if you've visited the People page before, you'll see a green ✓ next to it

## Usage

### Tracking Companies
1. Search for or navigate to a company on LinkedIn
2. Click on the company name to visit its profile
3. Go to the **People** tab
4. The company is now saved automatically with today's date

### Viewing Tracked Companies
- Click the green checkmark icon in your browser toolbar
- A popup shows:
  - Total number of tracked companies
  - List of all companies (linked to their profiles)
  - Date you first visited the People page
  - Number of times you've visited

### Exporting Your Data
- Open the popup → Click **"📥 Export List"**
- A JSON file (`linkedin-tracker-YYYY-MM-DD.json`) downloads to your Downloads folder
- Keep this file as a backup

### Importing Your Data
- Click **"📤 Import List"** in the popup
- Select a previously exported JSON file
- Your tracked companies are merged with any new data (visit counts are preserved)

### Clearing Your Data
- Click **"🗑️ Clear All"** in the popup
- Confirm when prompted
- All tracked companies are permanently deleted

### Role Highlighting
Color-coded badges appear next to job titles on LinkedIn People pages, making it easy to spot key contacts at a glance.

**Enabling/disabling**
- Open the popup → toggle **"Highlight Potential Connections on People Pages"**

**Managing categories**
- The popup lists all categories (e.g. Recruiter, Director, Founder). Each has a color swatch and a keyword count.
- Click **"+ Add"** to create a new category: give it a name and enter keywords (one per line).
- Click ✏️ to edit an existing category, 🗑️ to delete it.
- Keywords are matched case-insensitively against each person's job title.
  - **Plain text** — substring match (`engineer` matches "Senior Engineer")
  - **Regex** — JS syntax (`\bengineer\b` for whole-word, `^cto$` for exact). Invalid regex falls back to plain text.
- Five categories are seeded by default: **Recruiter**, **Director**, **Hiring Mgr**, **CTO/VP Eng**, **Founder**.

**Color palette**
Each category uses one of 16 preset color slots. Colors rotate automatically when you add new categories.

### Hiding Anonymous Profiles
- Open the popup → toggle **"Hide 'LinkedIn Member' profiles on People Pages"**
- When enabled, cards with no public profile (shown as "LinkedIn Member") are hidden from the People page so you can focus on reachable contacts.

### Invitation Tracker
- The popup shows a **"Connect Invitations"** section with a per-week bar chart.
- Sent and withdrawn counts are displayed together so you can see your net outreach per week.
- An invitation is counted when you:
  - Click **"Send without a note"**, **"Send now"**, or **"Send"** in the connection modal, or
  - Click a direct **"Connect"** button and LinkedIn confirms it (button changes to "Pending"), or
  - LinkedIn shows an **"Invitation sent"** toast.
- Counts are grouped by ISO week (Monday–Sunday UTC) and stored locally.

### Withdrawal Tracker
- Withdrawn invitations are counted on the **Invitation Manager** page (`/invitation-manager/`).
- Each withdrawal is attributed to the **week the invitation was sent** (not the current week), parsed from the relative date shown on the card (e.g. "Sent 3 weeks ago").
- Detection: a click on a Withdraw link is recorded; if the card disappears within 800 ms the count is confirmed; a "withdrawn" toast serves as a fallback.
- Counts are stored under `withdrawnInvitationStats` keyed by ISO-week Monday date (UTC).

### Search Strings
- Store reusable text snippets (e.g. Boolean search strings) in the popup under **"Search Strings"**.
- Each entry has a **label** (shown in the menu) and a **value** (the text to insert).
- To insert: right-click any editable field on LinkedIn → **"Insert search string"** → choose an entry.
- To manage: open the popup → expand **Strings** → click **+ Add**, ✏️ to edit, or 🗑️ to delete.

### Context Menu — Add to Keyword Category
- Select any text on a LinkedIn page, right-click, and choose **"Add to keyword category"** → pick a category.
- The selected text is normalized (trimmed, lowercased) and appended to that category's keyword list.

### Connect Promoter
- On any LinkedIn profile page (`/in/…`) the **Connect** action is automatically moved to the front of the action bar.
- If Connect is already a direct button, CSS repositioning handles it with no DOM changes.
- If Connect is buried inside the **More** dropdown, a synthetic Connect button is injected before the other actions; clicking it opens the dropdown and delegates to LinkedIn's own handler so the normal modal or direct-send flow fires.

## Project Structure

```
linkedin-extension/
├── manifest.json              # Chrome extension manifest (MV3)
├── background.js              # Service worker — context menu builder and keyword insertion
├── content.js                 # URL watcher, badge injection, orchestrates all content modules
├── palette.js                 # Shared 16-slot BADGE_PALETTE constant
├── storage-utils.js           # Storage key constants (SK.*) and typed read/write helpers
├── company-tracker.js         # CompanyTracker class — saves/loads seen companies and badges header
├── role-highlighter.js        # RoleHighlighter class — badges people by job title category
├── member-hider.js            # MemberHider class — hides anonymous "LinkedIn Member" cards
├── invitation-tracker.js      # InvitationTracker class — counts invitations sent per ISO week
├── withdrawal-tracker.js      # WithdrawalTracker class — counts withdrawn invitations per ISO week
├── connect-promoter.js        # ConnectPromoter class — moves Connect to front of action bar
├── styles.css                 # All injected styles (tracker badge, role badges, connect promoter)
├── popup.html                 # Popup UI
├── popup.js                   # Popup logic (settings toggles, category CRUD, export/import/clear)
├── popup.css                  # Popup styling
├── popup-view.js              # PopupView class — coordinates popup UI rendering
├── category-list-view.js      # CategoryListView class — category list with drag-and-drop reorder
├── invitation-chart-view.js   # renderInvitationChart() — SVG bar chart for invitation stats
├── linkedin-extension.instructions.md  # Development guidelines
├── README.md                  # This file
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

### URL Monitoring
- The extension polls your current URL every 500ms (LinkedIn is a single-page app)
- When you visit a URL matching `/company/{slug}/people/`, the company is saved automatically

### Badge Display
- Uses a `MutationObserver` to detect when the company header loads
- Appends a green ✓ badge next to the company name
- The badge is only added once per company per page load

### Role Highlighting
- `role-highlighter.js` runs on every People page (`/company/{slug}/people/`)
- After the page settles, it queries each person card and tests the job title text against every active category's keywords using `RegExp` (or plain substring fallback)
- A color-coded pill badge is injected into the card; matching stops at the first category hit
- Settings (enabled flag + categories array) are stored under `highlightingSettings` in `chrome.storage.local`
- Default categories are seeded once on first run if none exist

### Member Hider
- `member-hider.js` runs on People pages after highlighting
- Cards whose text starts with "LinkedIn Member" are tagged with `data-lkd-unreachable`
- When the toggle is on, those cards (and their `<li>` wrappers) are hidden via `display:none`; toggling off restores them
- The setting is stored as `hideUnreachable` inside `memberHiderSettings`

### Invitation Tracker
- `invitation-tracker.js` attaches a `MutationObserver` (toast fallback) and a capture-phase click listener on `document`
- Three detection paths are deduped with a `_lastSendAt` timestamp (5 s window) to avoid double-counting:
  1. **Modal send** — "Send without a note" / "Send now" / "Send" inside a dialog
  2. **Direct Connect** — "Connect" button that transitions to "Pending" within 1.5 s
  3. **Toast fallback** — "Invitation sent" toast injected into the DOM
- Counts are keyed by the Monday (UTC) of each ISO week and stored under `invitationStats`

### Withdrawal Tracker
- `withdrawal-tracker.js` runs on `/invitation-manager/` pages only
- A capture-phase click listener watches for clicks on `<a aria-label^="Withdraw invitation">`
- The sent date is parsed from the relative-date span on the card ("Sent X weeks ago") to attribute the withdrawal to the correct ISO week
- Confirmation path: if the card element is removed from the DOM within 800 ms the count is recorded; a "withdrawn" toast serves as a dedup-guarded fallback
- Counts are stored under `withdrawnInvitationStats` keyed by ISO-week Monday date (UTC)

### Connect Promoter
- `connect-promoter.js` runs on `/in/` profile pages
- **Case A** — Connect is already a direct button: `styles.css` applies `order: -1` to push it first; no JS changes needed
- **Case B** — Connect is only inside the More dropdown: a synthetic button is injected as the first child of the actions container; click opens the dropdown and programmatically clicks the hidden item so LinkedIn's own event handler fires

### Search Strings & Context Menu
- `background.js` (service worker) builds two context-menu subtrees on install, startup, and whenever settings change:
  - **"Add to keyword category"** — appears on text selections; adds the normalized selection to the chosen category's keyword list
  - **"Insert search string"** — appears on editable fields; sends a message to the content script to insert the chosen string at the cursor
- Stored under `searchStrings` in `chrome.storage.local` as an array of `{ id, label, value }` objects

### Data Storage
- All data is stored locally using Chrome's `storage.local` API
- Data syncs in real-time across all open LinkedIn tabs
- **Data never leaves your device** — no cloud sync, no external servers
- Storage keys: `seenCompanies`, `highlightingSettings`, `memberHiderSettings`, `invitationStats`, `withdrawnInvitationStats`, `searchStrings`

## Privacy & Data

- ✅ All data is stored **locally on your device**
- ✅ No tracking, no telemetry, no external requests
- ✅ Only required permissions: `storage` and `host_permissions` (LinkedIn only)
- ✅ You can export, back up, or delete your data anytime
- ✅ **For personal use only** — designed for individual network building, not bulk recruiting or data extraction
- ✅ Complies with LinkedIn's Terms of Service for personal use (not automated scraping or recruitment tools)

## Troubleshooting

### Badge not appearing on company profile?
- Reload the company page (Ctrl+R or Cmd+R)
- Check the extension popup to confirm the company is in the list
- Verify you visited the `/people` page (not just the company profile)

### Popup won't load or shows blank?
- Open Chrome DevTools → `chrome://extensions/` → Click "Details" on LinkedIn Tracker
- Check "Errors" tab for any JavaScript issues
- Try disabling and re-enabling the extension

### Can't import a JSON file?
- Ensure the file is valid JSON (use [jsonlint.com](https://jsonlint.com) to verify)
- Ensure the file was exported from this extension (contains `version: 1`)
- Try exporting again and re-importing

### Data not syncing across tabs?
- Ensure both tabs are on `linkedin.com`
- Check that the extension has permission for `https://www.linkedin.com/*`
- Reload one of the tabs

## Development

### Adding Features

Follow the [development guidelines](./linkedin-extension.instructions.md) for:
- Where to add new code
- How to maintain the minimal, non-intrusive design
- Testing checklist before submitting changes

### Building & Testing

1. Edit files in the repository
2. In Chrome: Go to `chrome://extensions/` and click the **refresh icon** on the LinkedIn Tracker extension
3. Test on LinkedIn immediately

### No Build Step
This is vanilla JavaScript — no build tools, no dependencies, no compilation needed.

## Future Enhancements (Possible)

- Filter popup by date range
- CSV export format
- Keyboard shortcuts
- Tagging or notes per company

(Only implemented if you request them!)

## License

Private extension for personal use. Not for distribution or commercial use.

## Support

For bugs or feature requests, create an issue or reach out directly.

---
