/**
 * ProspectScorer — scores LinkedIn /in/ profiles based on experience signals
 * and injects a colored semaphore badge (green/yellow/red) next to the h1.
 *
 * Scoring (each condition that fires costs 1 penalty point):
 *   1. Only 1 company entry in experience
 *   2. Last position ended ≥ 2 years ago (not "Present")
 *   3. Total tenure at last company > 8 years (96 months)
 *   4. Fewer followers than the configured minimum (default: 100)
 *
 *   0 penalties → green   (good prospect)
 *   1 penalty   → yellow  (some concern)
 *   2+ penalties → red    (significant concern)
 */
class ProspectScorer {
    constructor() {
        this.minFollowers = 100;
    }

    async loadSettings() {
        const settings = await getProspectScorerSettings();
        this.minFollowers = settings.minFollowers;
    }

    run() {
        if (!window.location.href.match(/linkedin\.com\/in\//))
            return;

        const h1 = document.querySelector('main h1') || document.querySelector('h1');
        if (!h1)
            return;

        // Guard: already scored this h1 (value is the level string)
        if (h1.getAttribute('data-lkd-prospect-scored'))
            return;

        const expAnchor = document.querySelector('#experience');
        if (!expAnchor)
            return;

        const expSection = expAnchor.closest('section');
        if (!expSection)
            return;

        const { companyCount, lastPositionCaption, lastCompanyMonths } = this._parseExperience(expSection);

        // Not enough data to score yet — wait for next mutation cycle
        if (lastPositionCaption === null && lastCompanyMonths === null)
            return;

        const endDateInfo = lastPositionCaption
            ? this._parseEndDate(lastPositionCaption)
            : { isPresent: true, date: null };

        const followerCount = this._parseFollowerCount();
        const { level, reasons } = this._score(companyCount, endDateInfo, lastCompanyMonths, followerCount);

        const badge = this._makeBadge(level, reasons);
        h1.setAttribute('data-lkd-prospect-scored', level);
        h1.appendChild(badge);

        // LinkedIn's React may append elements to h1 after we inject.
        // Watch h1: whenever a new child appears after our badge, move ours last.
        const obs = new MutationObserver(() => {
            if (badge.parentNode === h1 && badge !== h1.lastElementChild) {
                obs.disconnect();
                h1.appendChild(badge);
            }
        });

        obs.observe(h1, { childList: true });
    }

    _parseExperience(expSection) {
        const entries = expSection.querySelectorAll('li.artdeco-list__item');
        const companyCount = entries.length;
        const firstEntry = entries[0] ?? null;

        if (!firstEntry)
            return { companyCount, lastPositionCaption: null, lastCompanyMonths: null };

        // For single-position companies, caption-wrapper is at the entry level.
        // For grouped companies, caption-wrapper is on the first sub-position
        // (inside .pvs-entity__sub-components), so the query still finds it.
        const captionEl = firstEntry.querySelector('.pvs-entity__caption-wrapper[aria-hidden="true"]');
        const lastPositionCaption = captionEl ? captionEl.textContent.trim() : null;

        const lastCompanyMonths = this._getLastCompanyDurationMonths(firstEntry);

        return { companyCount, lastPositionCaption, lastCompanyMonths };
    }

    /**
     * For grouped companies (multiple positions at one employer), the total
     * company tenure is in a plain span[aria-hidden="true"] NOT inside
     * .pvs-entity__sub-components, e.g. "Contract · 6 yrs 11 mos".
     * For single-position entries, the duration suffix after '·' in the
     * caption-wrapper serves as the fallback.
     */
    _getLastCompanyDurationMonths(firstEntry) {
        const allSpans = firstEntry.querySelectorAll('span[aria-hidden="true"]');

        for (const span of allSpans) {
            if (span.closest('.pvs-entity__sub-components'))
                continue;

            const text = span.textContent.trim();
            const match = text.match(/·\s*(.+)$/);
            if (!match)
                continue;

            const months = this._parseDurationToMonths(match[1].trim());
            if (months !== null)
                return months;
        }

        // Fallback: parse duration suffix from the position-level caption wrapper
        const captionEl = firstEntry.querySelector('.pvs-entity__caption-wrapper[aria-hidden="true"]');
        if (!captionEl)
            return null;

        const captionText = captionEl.textContent.trim();
        const match = captionText.match(/·\s*(.+)$/);
        if (!match)
            return null;

        return this._parseDurationToMonths(match[1].trim());
    }

    /**
     * Parse end date from a caption like:
     *   "Aug 2023 - Present · 2 yrs 10 mos"
     *   "Jun 2021 - Aug 2023 · 2 yrs 3 mos"
     */
    _parseEndDate(captionText) {
        const datePart = captionText.split('·')[0].trim();
        const sides = datePart.split('-').map((s) => s.trim());

        if (sides.length < 2)
            return { isPresent: true, date: null };

        const endRaw = sides[sides.length - 1].trim();

        if (/present/i.test(endRaw))
            return { isPresent: true, date: null };

        return { isPresent: false, date: this._parseMonthYear(endRaw) };
    }

    _parseMonthYear(text) {
        const MONTHS = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };

        const parts = text.trim().split(/\s+/);
        if (parts.length < 2)
            return null;

        const monthIndex = MONTHS[parts[0].toLowerCase().slice(0, 3)];
        const year = parseInt(parts[1], 10);

        if (monthIndex === undefined || isNaN(year))
            return null;

        return new Date(year, monthIndex, 1);
    }

    /**
     * Parse a duration string like "6 yrs 11 mos", "3 mos", "1 yr", "2 yrs"
     * into a total number of months.
     */
    _parseDurationToMonths(text) {
        let total = 0;
        let matched = false;

        const yrMatch = text.match(/(\d+)\s+yr/);
        const moMatch = text.match(/(\d+)\s+mo/);

        if (yrMatch) { 
            total += parseInt(yrMatch[1], 10) * 12; 
            matched = true; 
        }

        if (moMatch) { 
            total += parseInt(moMatch[1], 10); 
            matched = true; 
        }

        return matched ? total : null;
    }

    /**
     * Look for "N followers" or "N+ followers" text in the profile header area.
     * Returns the integer count (treating "N+" as N), or null if not found.
     */
    _parseFollowerCount() {
        const main = document.querySelector('main');
        if (!main) 
            return null;

        const expSection = document.querySelector('#experience')?.closest('section');

        for (const span of main.querySelectorAll('span[aria-hidden="true"]')) {
            if (expSection?.contains(span)) 
                continue;

            const text = span.textContent.trim();
            const match = text.match(/^([\d,]+)\+?\s+followers$/i);
            if (match)
                return parseInt(match[1].replace(/,/g, ''), 10);
        }

        return null;
    }

    _checkSingleCompany(companyCount) {
        return companyCount === 1 ? 'Only 1 company in experience' : null;
    }

    _checkStalePosition(endDateInfo) {
        if (endDateInfo.isPresent || endDateInfo.date === null) 
            return null;

        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        return endDateInfo.date < twoYearsAgo ? 'Last position ended ≥ 2 years ago' : null;
    }

    _checkLongTenure(durationMonths) {
        return durationMonths !== null && durationMonths > 96
            ? 'Last company tenure > 8 years'
            : null;
    }

    _checkFollowerThreshold(followerCount) {
        return followerCount !== null && followerCount < this.minFollowers
            ? `Fewer than ${this.minFollowers} followers`
            : null;
    }

    _score(companyCount, endDateInfo, durationMonths, followerCount) {
        const reasons = [
            this._checkSingleCompany(companyCount),
            this._checkStalePosition(endDateInfo),
            this._checkLongTenure(durationMonths),
            this._checkFollowerThreshold(followerCount),
        ].filter(Boolean);

        const level = reasons.length === 0 ? 'green' : reasons.length === 1 ? 'yellow' : 'red';
        return { level, reasons };
    }

    _makeBadge(level, reasons) {
        const badge = document.createElement('span');
        badge.className = `lkd-prospect-badge lkd-prospect-badge--${level}`;
        badge.title = reasons.length > 0
            ? reasons.join('\n')
            : 'Looks like a good prospect';

        return badge;
    }

    async onStorageChanged(changes) {
        if (!changes[SK.PROSPECT_SCORER]) 
            return;

        await this.loadSettings();

        // Re-score the current profile with the updated threshold
        const h1 = document.querySelector('main h1') || document.querySelector('h1');
        if (h1) {
            h1.querySelector('.lkd-prospect-badge')?.remove();
            h1.removeAttribute('data-lkd-prospect-scored');
        }

        this.run();
    }
}
