import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('prospect-scorer.js');

// ── _parseDurationToMonths ────────────────────────────────────────────────

describe('ProspectScorer — _parseDurationToMonths', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('"6 yrs 11 mos" → 83', () => {
        expect(scorer._parseDurationToMonths('6 yrs 11 mos')).toBe(83);
    });

    test('"1 yr" → 12', () => {
        expect(scorer._parseDurationToMonths('1 yr')).toBe(12);
    });

    test('"3 mos" → 3', () => {
        expect(scorer._parseDurationToMonths('3 mos')).toBe(3);
    });

    test('"2 yrs" → 24', () => {
        expect(scorer._parseDurationToMonths('2 yrs')).toBe(24);
    });

    test('unrecognised text → null', () => {
        expect(scorer._parseDurationToMonths('foo')).toBeNull();
    });
});

// ── _parseMonthYear ───────────────────────────────────────────────────────

describe('ProspectScorer — _parseMonthYear', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('"Aug 2023" → Date(2023, 7, 1)', () => {
        expect(scorer._parseMonthYear('Aug 2023')).toEqual(new Date(2023, 7, 1));
    });

    test('"Jan 2020" → Date(2020, 0, 1)', () => {
        expect(scorer._parseMonthYear('Jan 2020')).toEqual(new Date(2020, 0, 1));
    });

    test('single word (no year) → null', () => {
        expect(scorer._parseMonthYear('2023')).toBeNull();
    });

    test('unrecognised month → null', () => {
        expect(scorer._parseMonthYear('Foo 2023')).toBeNull();
    });
});

// ── _parseEndDate ─────────────────────────────────────────────────────────

describe('ProspectScorer — _parseEndDate', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('Present variant → { isPresent: true, date: null }', () => {
        expect(scorer._parseEndDate('Aug 2023 - Present · 2 yrs 10 mos')).toEqual({
            isPresent: true,
            date: null,
        });
    });

    test('past end date → { isPresent: false, date: Date }', () => {
        expect(scorer._parseEndDate('Jun 2021 - Aug 2023 · 2 yrs 3 mos')).toEqual({
            isPresent: false,
            date: new Date(2023, 7, 1),
        });
    });

    test('no dash → fallback { isPresent: true, date: null }', () => {
        expect(scorer._parseEndDate('Jan 2020')).toEqual({ isPresent: true, date: null });
    });
});

// ── _checkSingleCompany ───────────────────────────────────────────────────

describe('ProspectScorer — _checkSingleCompany', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('count 1 → returns a reason string', () => {
        expect(scorer._checkSingleCompany(1)).toMatch(/1 company/i);
    });

    test('count 2 → null', () => {
        expect(scorer._checkSingleCompany(2)).toBeNull();
    });

    test('count 3 → null', () => {
        expect(scorer._checkSingleCompany(3)).toBeNull();
    });
});

// ── _checkStalePosition ───────────────────────────────────────────────────

describe('ProspectScorer — _checkStalePosition', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('isPresent: true → null', () => {
        expect(scorer._checkStalePosition({ isPresent: true, date: null })).toBeNull();
    });

    test('isPresent: false but date null → null', () => {
        expect(scorer._checkStalePosition({ isPresent: false, date: null })).toBeNull();
    });

    test('date > 2 years ago → reason string', () => {
        const staleDate = new Date();
        staleDate.setFullYear(staleDate.getFullYear() - 3);
        expect(scorer._checkStalePosition({ isPresent: false, date: staleDate })).toMatch(/2 years/i);
    });

    test('date < 2 years ago → null', () => {
        const recentDate = new Date();
        recentDate.setFullYear(recentDate.getFullYear() - 1);
        expect(scorer._checkStalePosition({ isPresent: false, date: recentDate })).toBeNull();
    });
});

// ── _checkLongTenure ──────────────────────────────────────────────────────

describe('ProspectScorer — _checkLongTenure', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('null → null', () => {
        expect(scorer._checkLongTenure(null)).toBeNull();
    });

    test('exactly 8 years (96 months) → null (threshold is >, not >=)', () => {
        expect(scorer._checkLongTenure(96)).toBeNull();
    });

    test('97 months (> 8 years) → reason string', () => {
        expect(scorer._checkLongTenure(97)).toMatch(/8 years/i);
    });

    test('custom maxCompanyYears 6: 73 months → reason', () => {
        scorer.maxCompanyYears = 6;
        expect(scorer._checkLongTenure(73)).toMatch(/6 years/i);
    });

    test('custom maxCompanyYears 6: 72 months → null', () => {
        scorer.maxCompanyYears = 6;
        expect(scorer._checkLongTenure(72)).toBeNull();
    });
});

// ── _checkFollowerThreshold ───────────────────────────────────────────────

describe('ProspectScorer — _checkFollowerThreshold', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('null → null', () => {
        expect(scorer._checkFollowerThreshold(null)).toBeNull();
    });

    test('exactly minFollowers (100) → null (threshold is <, not <=)', () => {
        expect(scorer._checkFollowerThreshold(100)).toBeNull();
    });

    test('99 (below threshold) → reason string', () => {
        expect(scorer._checkFollowerThreshold(99)).toMatch(/100 followers/i);
    });

    test('0 → reason string', () => {
        expect(scorer._checkFollowerThreshold(0)).toBeTruthy();
    });

    test('custom minFollowers 500: 499 → reason', () => {
        scorer.minFollowers = 500;
        expect(scorer._checkFollowerThreshold(499)).toMatch(/500 followers/i);
    });

    test('custom minFollowers 500: 500 → null', () => {
        scorer.minFollowers = 500;
        expect(scorer._checkFollowerThreshold(500)).toBeNull();
    });
});

// ── _checkNoDates ─────────────────────────────────────────────────────────

describe('ProspectScorer — _checkNoDates', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    test('hasDateInfo true → null', () => {
        expect(scorer._checkNoDates(true)).toBeNull();
    });

    test('hasDateInfo false → reason string', () => {
        expect(scorer._checkNoDates(false)).toMatch(/no dates/i);
    });
});

// ── _score ────────────────────────────────────────────────────────────────

describe('ProspectScorer — _score', () => {
    let scorer;

    beforeEach(() => {
        scorer = new ProspectScorer();
    });

    const presentEndDate = { isPresent: true, date: null };

    test('0 penalties → green with empty reasons array', () => {
        const result = scorer._score(2, presentEndDate, 72, 200, true);
        expect(result.level).toBe('green');
        expect(result.reasons).toHaveLength(0);
    });

    test('1 penalty (single company) → yellow with 1 reason', () => {
        const result = scorer._score(1, presentEndDate, 72, 200, true);
        expect(result.level).toBe('yellow');
        expect(result.reasons).toHaveLength(1);
    });

    test('2 penalties (single company + low followers) → red', () => {
        const result = scorer._score(1, presentEndDate, 72, 50, true);
        expect(result.level).toBe('red');
        expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    test('3+ penalties → still red', () => {
        const staleDate = new Date();
        staleDate.setFullYear(staleDate.getFullYear() - 3);
        const result = scorer._score(1, { isPresent: false, date: staleDate }, 72, 50, true);
        expect(result.level).toBe('red');
        expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    });

    test('hasDateInfo false contributes "No dates" reason', () => {
        const result = scorer._score(2, presentEndDate, null, null, false);
        expect(result.reasons.some((r) => /no dates/i.test(r))).toBe(true);
    });
});
