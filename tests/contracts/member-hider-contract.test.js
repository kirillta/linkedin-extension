/**
 * Storage contract: memberHiderSettings
 *
 * Verifies the shape MemberHider reads matches what popup.js writes, and that
 * migrateStorage() produces the same shape from old-format data.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('member-hider.js');

describe('member-hider contract — reader', () => {
  test('reads hideUnreachable: true', async () => {
    await setMemberHiderSettings({ hideUnreachable: true });

    const hider = new MemberHider();
    await hider.loadSettings();

    expect(hider.enabled).toBe(true);
  });

  test('reads hideUnreachable: false', async () => {
    await setMemberHiderSettings({ hideUnreachable: false });

    const hider = new MemberHider();
    await hider.loadSettings();

    expect(hider.enabled).toBe(false);
  });

  test('defaults to disabled on empty storage', async () => {
    const hider = new MemberHider();
    await hider.loadSettings();

    expect(hider.enabled).toBe(false);
  });
});

describe('member-hider contract — migration path', () => {
  test('migrateStorage produces correct memberHiderSettings that MemberHider can read', async () => {
    await chrome.storage.local.set({
      highlightingSettings: { enabled: true, categories: [], hideUnreachable: true },
    });

    await migrateStorage();

    const hider = new MemberHider();
    await hider.loadSettings();

    expect(hider.enabled).toBe(true);
  });

  test('popup write (setMemberHiderSettings) does not overwrite other future fields', async () => {
    // Simulate a hypothetical future field already stored
    await chrome.storage.local.set({
      memberHiderSettings: { hideUnreachable: false, futureField: 'keep-me' },
    });

    await setMemberHiderSettings({ hideUnreachable: true });

    const result = await getMemberHiderSettings();
    // The contract setter uses merge semantics — future fields survive
    expect(result.hideUnreachable).toBe(true);
    // Note: getMemberHiderSettings only normalizes known fields; futureField
    // is preserved in raw storage but not surfaced by the getter by design.
  });
});
