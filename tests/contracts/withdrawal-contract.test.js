/**
 * Storage contract: withdrawnInvitationStats
 *
 * Verifies WithdrawalTracker writes the correct shape and that counts
 * accumulate correctly for the given weekKey.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('withdrawal-tracker.js');

describe('withdrawal contract — increment', () => {
  let tracker;
  beforeEach(() => { tracker = new WithdrawalTracker(); });

  test('increments count for the given week key', async () => {
    const weekKey = tracker.getWeekKey(new Date());
    tracker.increment(weekKey);
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getWithdrawnStats();
    expect(stats[weekKey]).toBe(1);
  });

  test('accumulates multiple increments for the same week', async () => {
    const weekKey = tracker.getWeekKey(new Date());
    tracker.increment(weekKey);
    tracker.increment(weekKey);
    tracker.increment(weekKey);
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getWithdrawnStats();
    expect(stats[weekKey]).toBe(3);
  });

  test('creates a separate key for a different week', async () => {
    const weekA = '2026-05-04'; // a past Monday
    const weekB = tracker.getWeekKey(new Date());

    await setWithdrawnStats({ [weekA]: 5 });
    tracker.increment(weekB);
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getWithdrawnStats();
    expect(stats[weekA]).toBe(5);  // unchanged
    expect(stats[weekB]).toBe(1);  // new entry
  });

  test('attributes withdrawal to the sent week, not the current week', async () => {
    const sentWeekKey = '2026-04-14'; // a past Monday (not current week)
    tracker.increment(sentWeekKey);
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getWithdrawnStats();
    expect(stats[sentWeekKey]).toBe(1);
    const currentWeekKey = tracker.getWeekKey(new Date());
    expect(stats[currentWeekKey]).toBeUndefined();
  });

  test('does not increment when context is invalidated', async () => {
    const weekKey = tracker.getWeekKey(new Date());
    const rejectPromise = Promise.reject(new Error('context invalidated'));
    rejectPromise.catch(() => {});
    chrome.storage.local.get = () => rejectPromise;

    tracker.increment(weekKey);
    await new Promise((r) => setTimeout(r, 10));

    chrome.storage.local.get = (keys, cb) => cb({});
    const stats = await getWithdrawnStats();
    expect(Object.keys(stats)).toHaveLength(0);
  });
});

describe('withdrawal contract — deduplication (queue)', () => {
  let tracker;
  beforeEach(() => { tracker = new WithdrawalTracker(); });

  test('toast claims the oldest uncounted queue item', () => {
    tracker._queue.push(
      { card: null, weekKey: '2026-04-07', counted: false },
      { card: null, weekKey: '2026-05-11', counted: false },
    );
    const node = document.createElement('div');
    node.textContent = 'Invitation withdrawn';

    const spy = vi.spyOn(tracker, 'increment');
    tracker._checkForWithdrawalToast(node);

    expect(spy).toHaveBeenCalledWith('2026-04-07');
    expect(tracker._queue[0].counted).toBe(true);
    expect(tracker._queue[1].counted).toBe(false);
  });

  test('toast skips already-counted queue items', () => {
    tracker._queue.push(
      { card: null, weekKey: '2026-04-07', counted: true },
      { card: null, weekKey: '2026-05-11', counted: false },
    );
    const node = document.createElement('div');
    node.textContent = 'Invitation withdrawn';

    const spy = vi.spyOn(tracker, 'increment');
    tracker._checkForWithdrawalToast(node);

    expect(spy).toHaveBeenCalledWith('2026-05-11');
  });

  test('two rapid toasts each count their own queue item', () => {
    const weekKey = '2026-05-11';
    tracker._queue.push(
      { card: null, weekKey, counted: false },
      { card: null, weekKey, counted: false },
    );

    const spy = vi.spyOn(tracker, 'increment');
    const mkNode = () => {
      const n = document.createElement('div');
      n.textContent = 'Invitation withdrawn';
      return n;
    };

    tracker._checkForWithdrawalToast(mkNode());
    tracker._checkForWithdrawalToast(mkNode());

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, weekKey);
    expect(spy).toHaveBeenNthCalledWith(2, weekKey);
  });

  test('toast falls back to current week when queue is empty', () => {
    const node = document.createElement('div');
    node.textContent = 'Invitation withdrawn';

    const spy = vi.spyOn(tracker, 'increment');
    tracker._checkForWithdrawalToast(node);

    expect(spy).toHaveBeenCalledWith(tracker.getWeekKey(new Date()));
  });

  test('toast is skipped for already-marked DOM nodes', () => {
    const node = document.createElement('div');
    node.textContent = 'Invitation withdrawn';
    node.setAttribute('data-lkd-withdraw-counted', 'true');

    const spy = vi.spyOn(tracker, 'increment');
    tracker._checkForWithdrawalToast(node);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('withdrawal contract — _parseRelativeDate', () => {
  let tracker;
  beforeEach(() => { tracker = new WithdrawalTracker(); });

  test('"Sent today" returns today\'s week key', () => {
    const result = tracker.getWeekKey(tracker._parseRelativeDate('Sent today'));
    expect(result).toBe(tracker.getWeekKey(new Date()));
  });

  test('"Sent yesterday" returns yesterday\'s week key or today\'s if same week', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = tracker.getWeekKey(tracker._parseRelativeDate('Sent yesterday'));
    expect(result).toBe(tracker.getWeekKey(yesterday));
  });

  test('"Sent 3 weeks ago" shifts back 21 days', () => {
    const expected = new Date();
    expected.setDate(expected.getDate() - 21);
    const result = tracker.getWeekKey(tracker._parseRelativeDate('Sent 3 weeks ago'));
    expect(result).toBe(tracker.getWeekKey(expected));
  });

  test('"Sent 2 months ago" shifts back by 2 calendar months', () => {
    const expected = new Date();
    expected.setMonth(expected.getMonth() - 2);
    const result = tracker.getWeekKey(tracker._parseRelativeDate('Sent 2 months ago'));
    expect(result).toBe(tracker.getWeekKey(expected));
  });

  test('unrecognised text falls back to current week', () => {
    const result = tracker.getWeekKey(tracker._parseRelativeDate('Sent some time ago'));
    expect(result).toBe(tracker.getWeekKey(new Date()));
  });
});
