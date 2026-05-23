/**
 * Storage contract: invitationStats
 *
 * Verifies InvitationTracker writes the correct shape and that counts
 * accumulate correctly within and across week boundaries.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('invitation-tracker.js');

describe('invitation contract — increment', () => {
  let tracker;
  beforeEach(() => { tracker = new InvitationTracker(); });

  test('increments count for the current week', async () => {
    tracker.increment();
    // Wait for the async chain to complete
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getInvitationStats();
    const weekKey = tracker.getWeekKey(new Date());
    expect(stats[weekKey]).toBe(1);
  });

  test('accumulates multiple increments in the same week', async () => {
    tracker.increment();
    tracker.increment();
    tracker.increment();
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getInvitationStats();
    const weekKey = tracker.getWeekKey(new Date());
    expect(stats[weekKey]).toBe(3);
  });

  test('creates a separate key for a different week', async () => {
    const weekA = '2026-05-04'; // a past Monday
    const weekB = tracker.getWeekKey(new Date());

    await setInvitationStats({ [weekA]: 5 });
    tracker.increment();
    await new Promise((r) => setTimeout(r, 0));

    const stats = await getInvitationStats();
    expect(stats[weekA]).toBe(5);  // unchanged
    expect(stats[weekB]).toBe(1);  // new entry
  });

  test('does not increment when context is invalidated', async () => {
    // Simulate extension context death
    const origAlive = globalThis._invCtxAlive;
    // The module-level flag is set via the closure — simulate by calling
    // increment after manually setting the flag via the rejection path
    // (simplest approach: just verify the guard works by checking no write occurs
    //  when _invCtxAlive is false before the call)

    // We can't set _invCtxAlive directly (it's module-scoped), but we can
    // verify the promise-rejection path sets it: make get throw
    const origGet = chrome.storage.local.get;
    const rejectPromise = Promise.reject(new Error('context invalidated'));
    // Attach a no-op catch so Vitest does not flag it as unhandled; the
    // real handler is inside InvitationTracker.increment()'s .catch().
    rejectPromise.catch(() => {});
    chrome.storage.local.get = () => rejectPromise;

    tracker.increment();
    await new Promise((r) => setTimeout(r, 10));

    chrome.storage.local.get = origGet;
    const stats = await getInvitationStats();
    // No week key should have been written
    expect(Object.keys(stats)).toHaveLength(0);
  });
});

describe('invitation contract — deduplication (_lastSendAt)', () => {
  let tracker;
  beforeEach(() => { tracker = new InvitationTracker(); });

  test('_recordSend sets _lastSendAt', () => {
    const before = Date.now();
    tracker._recordSend();
    expect(tracker._lastSendAt).toBeGreaterThanOrEqual(before);
  });

  test('toast path is skipped if _lastSendAt is within 5 s', () => {
    tracker._lastSendAt = Date.now(); // just fired

    const node = document.createElement('div');
    node.textContent = 'Invitation sent';

    const spy = vi.spyOn(tracker, '_recordSend');
    tracker._checkForInvitationToast(node);

    expect(spy).not.toHaveBeenCalled();
  });

  test('toast path fires when _lastSendAt is older than 5 s', () => {
    tracker._lastSendAt = Date.now() - 6000; // 6 s ago

    const node = document.createElement('div');
    node.textContent = 'Invitation sent';

    const spy = vi.spyOn(tracker, '_recordSend');
    tracker._checkForInvitationToast(node);

    expect(spy).toHaveBeenCalledOnce();
  });
});
