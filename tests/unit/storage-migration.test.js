import { loadScript } from '../setup/load-script.js';
import { getStore } from '../setup/chrome-mock.js';

loadScript('storage-utils.js');

describe('migrateStorage', () => {
  test('migrates hideUnreachable from old highlightingSettings into its own key', async () => {
    // Seed the old format
    await chrome.storage.local.set({
      highlightingSettings: { enabled: true, categories: [], hideUnreachable: true },
    });

    await migrateStorage();

    const store = getStore();
    expect(store.memberHiderSettings).toEqual({ hideUnreachable: true });
    expect(store.highlightingSettings.hideUnreachable).toBeUndefined();
    expect(store.highlightingSettings.enabled).toBe(true);
  });

  test('preserves hideUnreachable: false from old format', async () => {
    await chrome.storage.local.set({
      highlightingSettings: { enabled: true, categories: [], hideUnreachable: false },
    });

    await migrateStorage();

    expect(getStore().memberHiderSettings).toEqual({ hideUnreachable: false });
  });

  test('is idempotent — no-op when memberHiderSettings already exists', async () => {
    await chrome.storage.local.set({
      highlightingSettings: { enabled: true, categories: [] },
      memberHiderSettings: { hideUnreachable: true },
    });

    await migrateStorage();

    // memberHiderSettings must remain unchanged
    expect(getStore().memberHiderSettings).toEqual({ hideUnreachable: true });
  });

  test('no-op when storage is completely empty', async () => {
    await migrateStorage();
    // Should create memberHiderSettings with false as default
    expect(getStore().memberHiderSettings).toEqual({ hideUnreachable: false });
  });

  test('does not corrupt existing categories during migration', async () => {
    const categories = [{ id: 'cat1', name: 'Recruiter', colorIndex: 0, keywords: ['recruiter'] }];
    await chrome.storage.local.set({
      highlightingSettings: { enabled: true, categories, hideUnreachable: false },
    });

    await migrateStorage();

    expect(getStore().highlightingSettings.categories).toEqual(categories);
  });
});
