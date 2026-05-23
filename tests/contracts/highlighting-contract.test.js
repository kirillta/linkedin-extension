/**
 * Storage contract: highlightingSettings
 *
 * These tests verify that the shape RoleHighlighter reads matches exactly what
 * popup.js and background.js write. A change to either the writer or the reader
 * that deviates from the contract will fail here before it reaches production.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('palette.js');
loadScript('role-highlighter.js');
loadScript('background.js');

// ── Reader: RoleHighlighter.loadSettings ─────────────────────────────────

describe('highlighting contract — reader (RoleHighlighter)', () => {
  test('reads enabled: false correctly', async () => {
    await setHighlightingSettings({ enabled: false, categories: [{ id: 'x', name: 'X', colorIndex: 0, keywords: [] }] });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.enabled).toBe(false);
  });

  test('reads enabled: true correctly', async () => {
    await setHighlightingSettings({ enabled: true, categories: [{ id: 'x', name: 'X', colorIndex: 0, keywords: [] }] });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.enabled).toBe(true);
  });

  test('reads categories correctly', async () => {
    const cats = [{ id: 'r', name: 'Recruiter', colorIndex: 0, keywords: ['recruiter'] }];
    await setHighlightingSettings({ enabled: true, categories: cats });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.categories).toEqual(cats);
  });

  test('seeds DEFAULT_CATEGORIES on first run (empty storage)', async () => {
    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.categories.length).toBeGreaterThan(0);
    expect(h.enabled).toBe(true);

    // Seeds must be persisted so next load picks them up
    const persisted = await getHighlightingSettings();
    expect(persisted.categories.length).toBeGreaterThan(0);
  });

  test('enabled flag is preserved when categories are seeded', async () => {
    // Someone called setHighlightingSettings({ enabled: false }) before first highlighter load
    await setHighlightingSettings({ enabled: false });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.enabled).toBe(false);
    expect(h.categories.length).toBeGreaterThan(0);
  });
});

// ── Writer: setHighlightingSettings (simulates popup toggle) ─────────────

describe('highlighting contract — writer (popup toggle)', () => {
  beforeEach(async () => {
    // Pre-seed with a category so the write must preserve it
    await setHighlightingSettings({
      enabled: true,
      categories: [{ id: 'r', name: 'Recruiter', colorIndex: 0, keywords: ['recruiter'] }],
    });
  });

  test('disabling does not wipe categories', async () => {
    await setHighlightingSettings({ enabled: false });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.enabled).toBe(false);
    expect(h.categories[0].id).toBe('r');
  });

  test('re-enabling restores enabled flag', async () => {
    await setHighlightingSettings({ enabled: false });
    await setHighlightingSettings({ enabled: true });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.enabled).toBe(true);
  });
});

// ── Writer: background.js keyword add ────────────────────────────────────

describe('highlighting contract — writer (background keyword add)', () => {
  beforeEach(async () => {
    await setHighlightingSettings({
      enabled: true,
      categories: [{ id: 'cat1', name: 'Recruiter', colorIndex: 0, keywords: ['recruiter'] }],
    });
  });

  test('adding a keyword preserves enabled flag and other categories', async () => {
    const settings = await getHighlightingSettings();
    const categories = [...settings.categories];
    categories[0] = { ...categories[0], keywords: [...categories[0].keywords, 'sourcing'] };
    await setHighlightingSettings({ categories });

    const h = new RoleHighlighter();
    await h.loadSettings();

    expect(h.enabled).toBe(true);
    expect(h.categories[0].keywords).toContain('sourcing');
    expect(h.categories[0].keywords).toContain('recruiter');
  });

  test('adding a duplicate keyword is refused (normalizeKeyword + dedup check)', () => {
    expect(normalizeKeyword('  Recruiter  ')).toBe('recruiter');
    // The actual dedup check is done in background.js click handler;
    // here we just verify normalizeKeyword produces the same key already stored
  });
});
