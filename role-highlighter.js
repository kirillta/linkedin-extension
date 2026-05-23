/**
 * RoleHighlighter — detects and badges people by role on LinkedIn People pages.
 * Categories are user-managed and stored in chrome.storage.local.
 */

/**
 * Seeded on first run if no categories exist in storage.
 * Keywords are tried as RegExp(kw, 'i'); invalid regex falls back to substring.
 */
const DEFAULT_CATEGORIES = [
    {
        id: 'recruiter',
        name: 'Recruiter',
        colorIndex: 0,
        keywords: [
            'recruiter', 'recruiting', 'talent', 'sourcing',
            'acquisition', 'headhunter', 'recruitment',
        ],
    },
    {
        id: 'director',
        name: 'Director',
        colorIndex: 1,
        keywords: [
            '\\bdirector\\b', '^dir\\.', '\\b(?:vp|vice\\s?president)\\b',
        ],
    },
    {
        id: 'hiring-manager',
        name: 'Hiring Mgr',
        colorIndex: 2,
        keywords: ['hiring\\s?manager', 'hiring\\s?lead'],
    },
    {
        id: 'cto',
        name: 'CTO/VP Eng',
        colorIndex: 3,
        keywords: [
            '\\bcto\\b', 'chief\\s?technology', 'chief\\s?engineer',
            'vp\\s?(?:of\\s)?engineering', 'vp\\s?eng',
        ],
    },
    {
        id: 'founder',
        name: 'Founder',
        colorIndex: 4,
        keywords: ['\\bfounder\\b', 'co[- ]?founder', 'founding'],
    },
];

class RoleHighlighter {
    constructor() {
        this.enabled = true;
        this.categories = [];
    }

    /**
     * Load highlighting settings (enabled flag + categories) from storage.
     * Seeds DEFAULT_CATEGORIES on first run if none are stored.
     */
    async loadSettings() {
        const settings = await getHighlightingSettings();
        this.enabled = settings.enabled;
        if (settings.categories.length > 0) {
            this.categories = settings.categories;
        } else {
            this.categories = DEFAULT_CATEGORIES;
            await setHighlightingSettings({ categories: DEFAULT_CATEGORIES });
        }
    }

    /**
     * Scan visible People page cards and append role badges where applicable.
     * Re-scans even cards already visited so new categories apply after form edits.
     */
    run() { 
        this.highlight(); 
    }

    async onStorageChanged(changes) {
        if (!changes.highlightingSettings) return;
        await this.loadSettings();
        this.highlight();
    }

    highlight() {
        if (!window.location.href.match(/linkedin\.com\/company\/([^/?]+)\/people/)) 
            return;

        if (!this.enabled) 
            return;

        try {
            const cards = this._getProfileCards();
            cards.forEach((card) => {
                try {
                    if (card.getAttribute('data-lkd-highlighted')) 
                        return;

                    const jobTitle = this._getJobTitle(card);
                    const category = this._matchCategory(jobTitle);
                    if (!category) 
                        return;

                    const titleEl = this._getTitleElement(card);
                    if (!titleEl || titleEl.querySelector('.lkd-role-badge')) 
                        return;

                    const palette = BADGE_PALETTE[category.colorIndex % BADGE_PALETTE.length];
                    const badge = document.createElement('span');

                    badge.className = 'lkd-role-badge';
                    badge.style.color = palette.text;
                    badge.style.background = `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bg2} 100%)`;
                    badge.style.borderColor = palette.border;
                    badge.textContent = category.name;
                    badge.title = `Category: ${category.name}`;

                    titleEl.appendChild(badge);
                    card.setAttribute('data-lkd-highlighted', 'true');
                } catch (_) { }
            });
        } catch (_) { }
    }

    /**
     * Find employee profile cards on the People page.
     * LinkedIn uses .artdeco-entity-lockup--size-7 for person cards (verified May 2026).
     * Falls back to any lockup containing a /in/ profile link.
     */
    _getProfileCards() {
        const candidates = document.querySelectorAll('.artdeco-entity-lockup--size-7');
        const sized = Array.from(candidates)
            .filter((el) => el.querySelector('a[href*="/in/"]'));
        if (sized.length > 0) 
            return sized;

        const all = document.querySelectorAll('.artdeco-entity-lockup');
        return Array.from(all).filter((el) => el.querySelector('a[href*="/in/"]'));
    }

    /**
     * Extract the job title string from a profile card.
     */
    _getJobTitle(card) {
        if (!card) 
            return '';

        try {
            const selectors = [
                '.artdeco-entity-lockup__subtitle',
                '[class*="subtitle"]',
                '.t-14',
                '.t-normal',
            ];
            for (const selector of selectors) {
                const el = card.querySelector(selector);
                if (el) {
                    const text = el.textContent.trim();
                    if (text.length > 0)
                        return text;
                }
            }
        } catch (_) { }

        return '';
    }

    /**
     * Find the DOM element to append a badge to (same as title element).
     */
    _getTitleElement(card) {
        if (!card) 
            return null;

        const selectors = [
            '.artdeco-entity-lockup__subtitle',
            '[class*="subtitle"]',
            '.t-14',
            '.t-normal',
        ];
        for (const selector of selectors) {
            const el = card.querySelector(selector);
            if (el && el.textContent.trim().length > 0)
                return el;
        }

        return null;
    }

    /**
     * Match a job title string against user-defined categories.
     * Each keyword is tried as a RegExp (case-insensitive); if the pattern is
     * invalid regex it falls back to a case-insensitive substring check.
     * Returns the first matching category object, or null.
     */
    _matchCategory(jobTitle) {
        if (!jobTitle) 
            return null;

        try {
            for (const category of this.categories) {
                for (const keyword of (category.keywords || [])) {
                    let matched = false;
                    try {
                        matched = new RegExp(keyword, 'i').test(jobTitle);
                    } catch (_) {
                        matched = jobTitle.toLowerCase()
                            .includes(keyword.toLowerCase());
                    }

                    if (matched) 
                        return category;
                }
            }
        } catch (_) { }

        return null;
    }
}
