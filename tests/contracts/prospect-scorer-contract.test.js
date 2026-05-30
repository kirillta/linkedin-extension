/**
 * Storage contract: prospectScorerSettings
 *
 * Verifies that the shape ProspectScorer reads from storage matches what
 * setProspectScorerSettings writes, and that onStorageChanged correctly
 * reloads settings and re-scores the current profile.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('prospect-scorer.js');

// ── getProspectScorerSettings defaults ────────────────────────────────────

describe('prospect scorer contract — getProspectScorerSettings', () => {
    test('returns default values on empty storage', async () => {
        const settings = await getProspectScorerSettings();
        expect(settings).toEqual({ minFollowers: 100, maxCompanyYears: 8 });
    });
});

// ── setProspectScorerSettings ─────────────────────────────────────────────

describe('prospect scorer contract — setProspectScorerSettings', () => {
    test('partial patch preserves the other key', async () => {
        await setProspectScorerSettings({ minFollowers: 200 });
        const settings = await getProspectScorerSettings();
        expect(settings.minFollowers).toBe(200);
        expect(settings.maxCompanyYears).toBe(8);
    });

    test('full patch overwrites both keys', async () => {
        await setProspectScorerSettings({ minFollowers: 50, maxCompanyYears: 5 });
        const settings = await getProspectScorerSettings();
        expect(settings).toEqual({ minFollowers: 50, maxCompanyYears: 5 });
    });

    test('does not clobber unrelated storage keys', async () => {
        await chrome.storage.local.set({ someOtherKey: 'preserved' });
        await setProspectScorerSettings({ minFollowers: 300 });
        const result = await chrome.storage.local.get('someOtherKey');
        expect(result.someOtherKey).toBe('preserved');
    });
});

// ── loadSettings() ────────────────────────────────────────────────────────

describe('prospect scorer contract — loadSettings()', () => {
    test('applies stored values to instance properties', async () => {
        await setProspectScorerSettings({ minFollowers: 500, maxCompanyYears: 5 });
        const scorer = new ProspectScorer();
        await scorer.loadSettings();

        expect(scorer.minFollowers).toBe(500);
        expect(scorer.maxCompanyYears).toBe(5);
    });

    test('uses defaults when storage is empty', async () => {
        const scorer = new ProspectScorer();
        await scorer.loadSettings();

        expect(scorer.minFollowers).toBe(100);
        expect(scorer.maxCompanyYears).toBe(8);
    });
});

// ── onStorageChanged() ────────────────────────────────────────────────────

describe('prospect scorer contract — onStorageChanged()', () => {
    test('ignores changes to unrelated storage keys', async () => {
        const scorer = new ProspectScorer();
        const spy = vi.spyOn(scorer, 'loadSettings');

        await scorer.onStorageChanged({ someOtherKey: { newValue: {} } });

        expect(spy).not.toHaveBeenCalled();
    });

    test('calls loadSettings when SK.PROSPECT_SCORER changes', async () => {
        const scorer = new ProspectScorer();
        const spy = vi.spyOn(scorer, 'loadSettings').mockResolvedValue();

        await scorer.onStorageChanged({ [SK.PROSPECT_SCORER]: { newValue: {} } });

        expect(spy).toHaveBeenCalled();
    });

    test('removes existing badge and re-scores the profile', async () => {
        Object.defineProperty(window, 'location', {
            value: { href: 'https://www.linkedin.com/in/john-doe/' },
            writable: true,
            configurable: true,
        });
        document.body.innerHTML = `
            <main>
                <h1>John Doe</h1>
                <span aria-hidden="true">250 followers</span>
                <section>
                    <div id="experience"></div>
                    <ul>
                        <li class="artdeco-list__item">
                            <span class="pvs-entity__caption-wrapper" aria-hidden="true">Jan 2020 - Present · 6 yrs 5 mos</span>
                        </li>
                        <li class="artdeco-list__item"></li>
                    </ul>
                </section>
            </main>
        `;

        const scorer = new ProspectScorer();
        scorer.run();

        const h1 = document.querySelector('h1');
        expect(h1.querySelector('.lkd-prospect-badge')).not.toBeNull();
        expect(h1.getAttribute('data-lkd-prospect-scored')).not.toBeNull();

        await scorer.onStorageChanged({ [SK.PROSPECT_SCORER]: { newValue: { minFollowers: 100, maxCompanyYears: 8 } } });

        // Badge must have been cleared and re-injected
        expect(h1.querySelector('.lkd-prospect-badge')).not.toBeNull();
        expect(h1.getAttribute('data-lkd-prospect-scored')).not.toBeNull();
    });
});
