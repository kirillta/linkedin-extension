/**
 * Unit tests for pure utility functions defined in popup.js:
 *   - nextColorIndex  — picks the next unused palette slot
 *   - getWeekKey      — maps any date to its Monday ISO key
 *   - getLastNWeekKeys — builds an ordered list of week keys
 *
 * These are global functions exposed via loadScript, identical in behaviour
 * to the equivalent methods on InvitationTracker but living in popup.js.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('palette.js');
loadScript('storage-utils.js');
loadScript('category-list-view.js');
loadScript('invitation-chart-view.js');
loadScript('popup-view.js'); // popup.js references PopupView inside loadPopup
loadScript('popup.js');

// ── nextColorIndex ────────────────────────────────────────────────────────

describe('nextColorIndex', () => {
    test('returns 0 for an empty category list', () => {
        expect(nextColorIndex([])).toBe(0);
    });

    test('returns max+1 for a list with one entry', () => {
        expect(nextColorIndex([{ colorIndex: 3 }])).toBe(4);
    });

    test('returns max+1 when multiple entries are present', () => {
        expect(nextColorIndex([{ colorIndex: 2 }, { colorIndex: 5 }, { colorIndex: 1 }])).toBe(6);
    });

    test('wraps around when max colorIndex is at the last palette slot', () => {
        // BADGE_PALETTE has 16 entries; wrapping from index 15 → 0
        const categories = [{ colorIndex: 15 }];
        expect(nextColorIndex(categories)).toBe(0);
    });

    test('defaults missing colorIndex to 0', () => {
        // A category without colorIndex (undefined) should be treated as 0
        expect(nextColorIndex([{ name: 'X' }])).toBe(1);
    });
});

// ── getWeekKey ────────────────────────────────────────────────────────────

describe('getWeekKey (popup.js)', () => {
    test('returns the Monday of a mid-week date', () => {
        // Wednesday 2026-05-13 → Monday 2026-05-11
        expect(getWeekKey(new Date('2026-05-13T12:00:00Z'))).toBe('2026-05-11');
    });

    test('returns the same Monday for a Monday input', () => {
        expect(getWeekKey(new Date('2026-05-11T00:00:00Z'))).toBe('2026-05-11');
    });

    test('maps Sunday back to the previous Monday', () => {
        // Sunday 2026-05-17 → Monday 2026-05-11
        expect(getWeekKey(new Date('2026-05-17T23:59:59Z'))).toBe('2026-05-11');
    });

    test('handles a year-boundary date', () => {
        // Wednesday 2025-01-01 → Monday 2024-12-30
        expect(getWeekKey(new Date('2025-01-01T00:00:00Z'))).toBe('2024-12-30');
    });
});

// ── getLastNWeekKeys ──────────────────────────────────────────────────────

describe('getLastNWeekKeys (popup.js)', () => {
    test('returns exactly n keys', () => {
        expect(getLastNWeekKeys(8).length).toBe(8);
    });

    test('first key is the most recent week', () => {
        const keys = getLastNWeekKeys(1);
        // The single key must be the Monday of the current (test-run) week
        const expectedMonday = getWeekKey(new Date());
        expect(keys[0]).toBe(expectedMonday);
    });

    test('consecutive keys are exactly 7 days apart', () => {
        const keys = getLastNWeekKeys(4);
        for (let i = 0; i < keys.length - 1; i++) {
            const diff =
                new Date(keys[i] + 'T00:00:00Z') - new Date(keys[i + 1] + 'T00:00:00Z');
            expect(diff).toBe(7 * 24 * 60 * 60 * 1000); // 7 days in ms
        }
    });

    test('keys are in descending order (most recent first)', () => {
        const keys = getLastNWeekKeys(4);
        for (let i = 0; i < keys.length - 1; i++) {
            expect(keys[i] > keys[i + 1]).toBe(true);
        }
    });

    test('returns an empty array for n=0', () => {
        expect(getLastNWeekKeys(0)).toEqual([]);
    });
});
