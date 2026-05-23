import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('invitation-tracker.js');

describe('InvitationTracker.getWeekKey', () => {
  let tracker;
  beforeEach(() => { tracker = new InvitationTracker(); });

  test('returns the Monday of a mid-week date', () => {
    // Wednesday 2026-05-13 → Monday 2026-05-11
    expect(tracker.getWeekKey(new Date('2026-05-13T12:00:00Z'))).toBe('2026-05-11');
  });

  test('returns the same Monday for a Monday input', () => {
    expect(tracker.getWeekKey(new Date('2026-05-11T00:00:00Z'))).toBe('2026-05-11');
  });

  test('maps Sunday back to the previous Monday', () => {
    // Sunday 2026-05-17 → Monday 2026-05-11
    expect(tracker.getWeekKey(new Date('2026-05-17T23:59:59Z'))).toBe('2026-05-11');
  });

  test('handles year boundary correctly', () => {
    // Wednesday 2025-01-01 → Monday 2024-12-30
    expect(tracker.getWeekKey(new Date('2025-01-01T00:00:00Z'))).toBe('2024-12-30');
  });

  test('handles Friday correctly', () => {
    // Friday 2026-05-15 → Monday 2026-05-11
    expect(tracker.getWeekKey(new Date('2026-05-15T00:00:00Z'))).toBe('2026-05-11');
  });
});
