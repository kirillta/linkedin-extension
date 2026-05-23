/**
 * Storage contract: seenCompanies
 *
 * Verifies CompanyTracker writes the correct shape and that load() reads it
 * back correctly, including edge cases like duplicate saves and clearing.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');

// CompanyTracker.save() calls document.querySelector('h1') — provide a stub
beforeEach(() => {
  document.body.innerHTML = '<h1>Acme Corp</h1>';
});

loadScript('company-tracker.js');

describe('company contract — save and load', () => {
  let tracker;
  beforeEach(() => { tracker = new CompanyTracker(); });

  test('save writes slug and load reads it back', async () => {
    await tracker.save('acme-corp');
    await tracker.load();

    expect(tracker.seenCompanies.has('acme-corp')).toBe(true);
  });

  test('saved entry has correct shape', async () => {
    await tracker.save('acme-corp');

    const companies = await getSeenCompanies();
    expect(companies['acme-corp']).toMatchObject({
      slug: 'acme-corp',
      name: expect.any(String),
      firstSeen: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  test('saving the same slug twice preserves firstSeen', async () => {
    await tracker.save('acme-corp');
    const first = (await getSeenCompanies())['acme-corp'].firstSeen;

    await new Promise((r) => setTimeout(r, 5));
    await tracker.save('acme-corp');
    const second = (await getSeenCompanies())['acme-corp'].firstSeen;

    expect(second).toBe(first);
  });

  test('saving multiple slugs keeps all of them', async () => {
    await tracker.save('acme-corp');
    await tracker.save('globex');

    await tracker.load();

    expect(tracker.seenCompanies.has('acme-corp')).toBe(true);
    expect(tracker.seenCompanies.has('globex')).toBe(true);
  });

  test('load on empty storage results in empty set', async () => {
    await tracker.load();
    expect(tracker.seenCompanies.size).toBe(0);
  });

  test('clearing storage then loading yields empty set', async () => {
    await tracker.save('acme-corp');
    await setSeenCompanies({});
    await tracker.load();

    expect(tracker.seenCompanies.size).toBe(0);
  });
});

describe('company contract — normalizeSlug', () => {
  let tracker;
  beforeEach(() => { tracker = new CompanyTracker(); });

  test('normalizes before save so load finds the same key', async () => {
    const raw = 'Acme-Corp/';
    const slug = tracker.normalizeSlug(raw);
    await tracker.save(slug);
    await tracker.load();

    expect(tracker.seenCompanies.has('acme-corp')).toBe(true);
  });
});
