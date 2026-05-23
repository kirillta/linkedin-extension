import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('palette.js');
loadScript('role-highlighter.js');

describe('RoleHighlighter._matchCategory', () => {
  let highlighter;

  beforeEach(() => {
    highlighter = new RoleHighlighter();
    highlighter.categories = [
      { id: 'recruiter', name: 'Recruiter', colorIndex: 0, keywords: ['recruiter', 'talent'] },
      { id: 'cto',       name: 'CTO',       colorIndex: 1, keywords: ['\\bcto\\b', 'chief technology'] },
      { id: 'founder',   name: 'Founder',   colorIndex: 2, keywords: ['\\bfounder\\b'] },
    ];
  });

  test('matches a plain keyword substring', () => {
    expect(highlighter._matchCategory('Senior Recruiter')).toMatchObject({ id: 'recruiter' });
  });

  test('matches a regex keyword', () => {
    expect(highlighter._matchCategory('CTO at Acme')).toMatchObject({ id: 'cto' });
  });

  test('regex word boundary prevents partial matches', () => {
    // "cofounder" should NOT match \bfounder\b
    expect(highlighter._matchCategory('cofounder')).toBeNull();
  });

  test('returns the first matching category when multiple could match', () => {
    highlighter.categories[0].keywords.push('cto'); // recruiter now also matches cto text
    // recruiter is first, so it wins
    expect(highlighter._matchCategory('CTO Recruiter')).toMatchObject({ id: 'recruiter' });
  });

  test('returns null when nothing matches', () => {
    expect(highlighter._matchCategory('Software Engineer')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(highlighter._matchCategory('')).toBeNull();
  });

  test('invalid regex falls back to case-insensitive substring', () => {
    highlighter.categories = [
      { id: 'bad', name: 'Bad', colorIndex: 0, keywords: ['[invalid(regex'] },
    ];
    // "[invalid(regex" as a plain string won't match "engineer"
    expect(highlighter._matchCategory('engineer')).toBeNull();
    // but it should match itself as a substring (fallback path)
    expect(highlighter._matchCategory('[invalid(regex stuff')).toMatchObject({ id: 'bad' });
  });

  test('matching is case-insensitive', () => {
    expect(highlighter._matchCategory('HEAD OF TALENT')).toMatchObject({ id: 'recruiter' });
  });
});
