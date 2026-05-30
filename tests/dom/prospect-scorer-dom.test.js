import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('prospect-scorer.js');

/**
 * Builds a minimal LinkedIn /in/ profile page in document.body.
 *
 * @param {object} opts
 * @param {number} [opts.companyCount=2]      Number of artdeco-list__item entries.
 * @param {string} [opts.captionText]         Text for .pvs-entity__caption-wrapper on first entry.
 * @param {string} [opts.followerText]        Text for the follower span (e.g. "250 followers").
 * @param {string} [opts.groupedDuration]     If set, adds a top-level span[aria-hidden] with
 *                                            "Full-time · {value}" on the first entry to simulate
 *                                            a grouped-company total-tenure span.
 */
function buildProfilePage({ companyCount = 2, captionText = null, followerText = null, groupedDuration = null } = {}) {
    Object.defineProperty(window, 'location', {
        value: { href: 'https://www.linkedin.com/in/john-doe/' },
        writable: true,
        configurable: true,
    });

    const main = document.createElement('main');

    const h1 = document.createElement('h1');
    h1.textContent = 'John Doe';
    main.appendChild(h1);

    if (followerText) {
        const followerSpan = document.createElement('span');
        followerSpan.setAttribute('aria-hidden', 'true');
        followerSpan.textContent = followerText;
        main.appendChild(followerSpan);
    }

    const section = document.createElement('section');
    const anchor = document.createElement('div');
    anchor.id = 'experience';
    section.appendChild(anchor);

    const ul = document.createElement('ul');
    for (let i = 0; i < companyCount; i++) {
        const li = document.createElement('li');
        li.className = 'artdeco-list__item';

        if (i === 0) {
            if (groupedDuration) {
                // Grouped company: duration span at entry level, NOT inside sub-components
                const durationSpan = document.createElement('span');
                durationSpan.setAttribute('aria-hidden', 'true');
                durationSpan.textContent = `Full-time · ${groupedDuration}`;
                li.appendChild(durationSpan);

                const subComponents = document.createElement('div');
                subComponents.className = 'pvs-entity__sub-components';
                if (captionText) {
                    const captionEl = document.createElement('span');
                    captionEl.className = 'pvs-entity__caption-wrapper';
                    captionEl.setAttribute('aria-hidden', 'true');
                    captionEl.textContent = captionText;
                    subComponents.appendChild(captionEl);
                }
                li.appendChild(subComponents);
            } else if (captionText) {
                const captionEl = document.createElement('span');
                captionEl.className = 'pvs-entity__caption-wrapper';
                captionEl.setAttribute('aria-hidden', 'true');
                captionEl.textContent = captionText;
                li.appendChild(captionEl);
            }
        }

        ul.appendChild(li);
    }

    section.appendChild(ul);
    main.appendChild(section);

    document.body.innerHTML = '';
    document.body.appendChild(main);
}

// ── run() guards ──────────────────────────────────────────────────────────

describe('ProspectScorer DOM — run() guards', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('no-ops when URL is not a /in/ profile', () => {
        buildProfilePage({ companyCount: 2, captionText: 'Jan 2020 - Present · 6 yrs 5 mos', followerText: '250 followers' });
        window.location = { href: 'https://www.linkedin.com/feed/' };
        scorer.run();

        expect(document.querySelector('.lkd-prospect-badge')).toBeNull();
    });

    test('no-ops when there is no h1', () => {
        window.location = { href: 'https://www.linkedin.com/in/john-doe/' };
        document.body.innerHTML = '<main><section><div id="experience"></div></section></main>';
        scorer.run();

        expect(document.querySelector('.lkd-prospect-badge')).toBeNull();
    });

    test('no-ops when #experience section is missing', () => {
        window.location = { href: 'https://www.linkedin.com/in/john-doe/' };
        document.body.innerHTML = '<main><h1>John Doe</h1></main>';
        scorer.run();

        expect(document.querySelector('.lkd-prospect-badge')).toBeNull();
    });

    test('no-ops when experience section has no list entries', () => {
        window.location = { href: 'https://www.linkedin.com/in/john-doe/' };
        document.body.innerHTML = '<main><h1>John Doe</h1><section><div id="experience"></div><ul></ul></section></main>';
        scorer.run();

        expect(document.querySelector('.lkd-prospect-badge')).toBeNull();
    });

    test('does not inject a second badge when called twice (idempotent)', () => {
        buildProfilePage({ companyCount: 2, captionText: 'Jan 2020 - Present · 6 yrs 5 mos', followerText: '250 followers' });
        scorer.run();
        scorer.run();

        expect(document.querySelectorAll('.lkd-prospect-badge')).toHaveLength(1);
    });
});

// ── badge injection ───────────────────────────────────────────────────────

describe('ProspectScorer DOM — badge injection', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('injects green badge for a clean prospect', () => {
        buildProfilePage({
            companyCount: 2,
            captionText: 'Jan 2020 - Present · 6 yrs 5 mos',
            followerText: '250 followers',
        });
        scorer.run();

        const badge = document.querySelector('.lkd-prospect-badge');
        expect(badge).not.toBeNull();
        expect(badge.classList.contains('lkd-prospect-badge--green')).toBe(true);
        expect(document.querySelector('h1').getAttribute('data-lkd-prospect-scored')).toBe('green');
        expect(badge.title).toBe('Looks like a good prospect');
    });

    test('injects yellow badge for exactly 1 penalty (single company)', () => {
        buildProfilePage({
            companyCount: 1,
            captionText: 'Jan 2020 - Present · 6 yrs 5 mos',
            followerText: '250 followers',
        });
        scorer.run();

        const badge = document.querySelector('.lkd-prospect-badge');
        expect(badge).not.toBeNull();
        expect(badge.classList.contains('lkd-prospect-badge--yellow')).toBe(true);
    });

    test('injects red badge for 2+ penalties (single company + low followers)', () => {
        buildProfilePage({
            companyCount: 1,
            captionText: 'Jan 2020 - Present · 6 yrs 5 mos',
            followerText: '50 followers',
        });
        scorer.run();

        const badge = document.querySelector('.lkd-prospect-badge');
        expect(badge).not.toBeNull();
        expect(badge.classList.contains('lkd-prospect-badge--red')).toBe(true);
    });

    test('badge title lists penalty reasons when yellow/red', () => {
        buildProfilePage({
            companyCount: 1,
            captionText: 'Jan 2020 - Present · 6 yrs 5 mos',
            followerText: '250 followers',
        });
        scorer.run();

        const badge = document.querySelector('.lkd-prospect-badge');
        expect(badge.title).toMatch(/1 company/i);
    });
});

// ── _parseExperience ──────────────────────────────────────────────────────

describe('ProspectScorer DOM — _parseExperience', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('single-position company: reads company count, caption, and duration', () => {
        buildProfilePage({ companyCount: 3, captionText: 'Jun 2021 - Aug 2023 · 2 yrs 3 mos' });
        const section = document.querySelector('#experience').closest('section');
        const result = scorer._parseExperience(section);

        expect(result.companyCount).toBe(3);
        expect(result.lastPositionCaption).toBe('Jun 2021 - Aug 2023 · 2 yrs 3 mos');
        expect(result.lastCompanyMonths).toBe(27); // 2*12 + 3
    });

    test('grouped company: reads total tenure from top-level span (not sub-components)', () => {
        buildProfilePage({
            companyCount: 2,
            groupedDuration: '6 yrs 11 mos',
            captionText: 'Jan 2020 - Present · 6 yrs 5 mos',
        });
        const section = document.querySelector('#experience').closest('section');
        const result = scorer._parseExperience(section);

        expect(result.lastCompanyMonths).toBe(83); // 6*12 + 11
    });

    test('returns companyCount 0 with null caption and months for an empty section', () => {
        document.body.innerHTML = '<main><section><div id="experience"></div><ul></ul></section></main>';
        const section = document.querySelector('#experience').closest('section');
        const result = scorer._parseExperience(section);

        expect(result.companyCount).toBe(0);
        expect(result.lastPositionCaption).toBeNull();
        expect(result.lastCompanyMonths).toBeNull();
    });
});

// ── _parseFollowerCount ───────────────────────────────────────────────────

describe('ProspectScorer DOM — _parseFollowerCount', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('finds plain follower count span in main', () => {
        buildProfilePage({ followerText: '250 followers' });
        expect(scorer._parseFollowerCount()).toBe(250);
    });

    test('handles comma-formatted counts', () => {
        buildProfilePage({ followerText: '1,234 followers' });
        expect(scorer._parseFollowerCount()).toBe(1234);
    });

    test('handles "N+" follower format', () => {
        buildProfilePage({ followerText: '500+ followers' });
        expect(scorer._parseFollowerCount()).toBe(500);
    });

    test('returns null when no follower span is present', () => {
        buildProfilePage({}); // no followerText
        expect(scorer._parseFollowerCount()).toBeNull();
    });

    test('ignores follower-like text inside the experience section', () => {
        // captionText is inside experience section — must be skipped
        buildProfilePage({ companyCount: 2, captionText: '100 followers' });
        expect(scorer._parseFollowerCount()).toBeNull();
    });
});

// ── _makeBadge ────────────────────────────────────────────────────────────

describe('ProspectScorer DOM — _makeBadge', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('returns a span element with the correct CSS classes', () => {
        const badge = scorer._makeBadge('green', []);
        expect(badge.tagName).toBe('SPAN');
        expect(badge.className).toBe('lkd-prospect-badge lkd-prospect-badge--green');
    });

    test('title is the "good prospect" string when there are no reasons', () => {
        const badge = scorer._makeBadge('green', []);
        expect(badge.title).toBe('Looks like a good prospect');
    });

    test('title joins reasons with newline when reasons are present', () => {
        const reasons = ['Only 1 company in experience', 'Fewer than 100 followers'];
        const badge = scorer._makeBadge('yellow', reasons);
        expect(badge.title).toBe(reasons.join('\n'));
    });

    test('creates the correct class for the red level', () => {
        const badge = scorer._makeBadge('red', ['reason']);
        expect(badge.classList.contains('lkd-prospect-badge--red')).toBe(true);
    });
});
