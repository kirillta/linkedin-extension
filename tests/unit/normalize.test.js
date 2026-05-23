import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('company-tracker.js');
loadScript('background.js');

describe('CompanyTracker.normalizeSlug', () => {
  let tracker;
  beforeEach(() => { tracker = new CompanyTracker(); });

  test('lowercases the slug', () => {
    expect(tracker.normalizeSlug('Acme-Corp')).toBe('acme-corp');
  });

  test('strips trailing slash', () => {
    expect(tracker.normalizeSlug('acme/')).toBe('acme');
  });

  test('strips trailing slash after lowercasing', () => {
    expect(tracker.normalizeSlug('ACME/')).toBe('acme');
  });

  test('leaves clean slugs unchanged', () => {
    expect(tracker.normalizeSlug('acme-corp')).toBe('acme-corp');
  });
});

describe('background.normalizeKeyword', () => {
  test('trims whitespace', () => {
    expect(normalizeKeyword('  recruiter  ')).toBe('recruiter');
  });

  test('lowercases', () => {
    expect(normalizeKeyword('VP Engineering')).toBe('vp engineering');
  });

  test('returns empty string for whitespace-only input', () => {
    expect(normalizeKeyword('   ')).toBe('');
  });
});
