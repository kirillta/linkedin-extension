/**
 * CompanyTracker — tracks visited company People pages and badges the header.
 */
class CompanyTracker {
    constructor() {
        this.seenCompanies = new Set();
    }

    /**
     * Load tracked companies from storage into the in-memory cache.
     */
    async load() {
        try {
            const companies = await getSeenCompanies();
            this.seenCompanies.clear();
            Object.keys(companies)
                .forEach((slug) => this.seenCompanies.add(slug));
        } catch (_) { }
    }

    /**
     * Save a company slug as "seen" and update the cache.
     */
    async save(slug) {
        try {
            const companies = await getSeenCompanies();
            const nameEl = document.querySelector('h1');
            const name = nameEl 
                ? nameEl.textContent.trim() 
                : slug;
            
            if (!companies[slug]) 
                companies[slug] = { slug, name, firstSeen: new Date().toISOString() };

            this.seenCompanies.add(slug);
            await setSeenCompanies(companies);
        } catch (_) { }
    }

    /**
     * Normalize a company slug to lowercase with no trailing slashes.
     */
    normalizeSlug(slug) {
        return slug.toLowerCase()
            .replace(/\/$/, '');
    }

    /**
     * Inject a ✓ badge into the company profile header if this company has been seen.
     */
    injectHeaderBadge() {
        const companyMatch = window.location.href.match(/linkedin\.com\/company\/([^/?]+)/);
        if (!companyMatch)
            return;

        const slug = this.normalizeSlug(companyMatch[1]);
        if (this.seenCompanies.has(slug)) 
            this._badgeCompanyHeader(slug);
    }

    /**
     * Badge seen companies on /search/results/companies/ pages.
     *
     * LinkedIn fully obfuscates class names, so class-based selectors are
     * unreliable. Instead, group all a[href*="/company/"] links by slug.
     * Each card has two text-only name links for the same slug: one inside a
     * hidden <div> (used as an aria-labelledby label) and one inside a <p>
     * (the visible title). We prefer the <p>-wrapped link.
     */
    badgeSearchResultCards() {
        if (!window.location.href.includes('/search/results/companies/')) 
            return;

        const allLinks = document.querySelectorAll('a[href*="/company/"]');
        const bySlug = new Map();

        allLinks.forEach((link) => {
            const match = link.href.match(/\/company\/([^/?#]+)/);
            if (!match) 
                return;
            
            const slug = this.normalizeSlug(match[1]);
            if (!bySlug.has(slug)) 
                bySlug.set(slug, []);
            
            bySlug.get(slug).push(link);
        });

        bySlug.forEach((links, slug) => {
            if (!this.seenCompanies.has(slug)) 
                return;

            // The card contains two text-only name links with the same href:
            //   1. Inside a <div id="..."> used only as an aria-labelledby target — visually hidden.
            //   2. Inside a <p> — the visually rendered company name.
            // Prefer the <p>-wrapped link; fall back to any text-only link, then the first link.
            const textLinks = links.filter((a) => a.children.length === 0 && a.textContent.trim().length > 0);
            const nameLink = textLinks.find((a) => a.closest('p')) || textLinks[0] || links[0];
            if (!nameLink) 
                return;

            const parent = nameLink.parentElement;
            if (!parent || parent.querySelector('.lkd-seen-badge')) 
                return;

            nameLink.insertAdjacentElement('afterend', this._makeBadge('Seen'));
        });
    }

    _makeBadge(title) {
        const badge = document.createElement('span');
        badge.className = 'lkd-seen-badge';
        badge.title = title;
        badge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="9" height="9" fill="none" aria-hidden="true">'
            + '<polyline points="1.5,5.5 4,8 8.5,2" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
            + '</svg>';

        return badge;
    }

    run() {
        this.injectHeaderBadge();
        this.badgeSearchResultCards();
    }

    async onStorageChanged(changes) {
        if (!changes.seenCompanies) 
            return;

        await this.load();
        this.run();
    }

    _badgeCompanyHeader(slug) {
        const h1 = document.querySelector('[data-test-id="top-card-headline"] h1, h1');
        if (!h1) 
            return;

        // Guard: skip if we already injected for this exact company.
        // Store the slug (not just 'true') so that when LinkedIn reuses the same
        // h1 element during SPA navigation, a different slug bypasses the guard.
        if (h1.getAttribute('data-lkd-seen-header') === slug) 
            return;

        // Remove a stale badge left from a previously visited company on this h1.
        h1.querySelector('.lkd-seen-badge-header')?.remove();
        h1.setAttribute('data-lkd-seen-header', slug);

        getSeenCompanies().then((companies) => {
            const companyData = companies[slug] ?? null;

            const badge = this._makeBadge(
                companyData
                    ? `Seen: ${new Date(companyData.firstSeen).toLocaleDateString()}`
                    : 'Seen'
            );
            badge.classList.add('lkd-seen-badge-header');
            h1.appendChild(badge);

            // LinkedIn's React appends its verification icon to h1 after we inject.
            // Watch h1 specifically: the moment any new child appears after our badge,
            // move ours to the end, then stop watching to avoid a reaction loop.
            const obs = new MutationObserver(() => {
                if (badge.parentNode === h1 && badge !== h1.lastElementChild) {
                    obs.disconnect();
                    h1.appendChild(badge);
                }
            });
            
            obs.observe(h1, { childList: true });
        }).catch(() => { });
    }
}
