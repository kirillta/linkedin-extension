/**
 * DOM snapshot tests: RoleHighlighter
 *
 * Synthetic fixture mirrors LinkedIn's People page card structure as of May 2026.
 * Selectors verified: .artdeco-entity-lockup--size-7, .artdeco-entity-lockup__subtitle
 *
 * When LinkedIn changes its markup, these tests will fail — update the fixture
 * to match the new structure and record the date in the comment above.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('palette.js');
loadScript('role-highlighter.js');

function buildCard(titleText, withProfileLink = true) {
  const card = document.createElement('div');
  card.className = 'artdeco-entity-lockup artdeco-entity-lockup--size-7';

  if (withProfileLink) {
    const a = document.createElement('a');
    a.href = 'https://www.linkedin.com/in/jane-doe/';
    card.appendChild(a);
  }

  const subtitle = document.createElement('span');
  subtitle.className = 'artdeco-entity-lockup__subtitle';
  subtitle.textContent = titleText;
  card.appendChild(subtitle);

  return card;
}

function buildPeoplePage(cards) {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'location', {
    value: { href: 'https://www.linkedin.com/company/acme/people' },
    writable: true,
  });
  cards.forEach((c) => document.body.appendChild(c));
}

describe('RoleHighlighter DOM — badge injection', () => {
  let highlighter;

  beforeEach(() => {
    highlighter = new RoleHighlighter();
    highlighter.enabled = true;
    highlighter.categories = [
      { id: 'recruiter', name: 'Recruiter', colorIndex: 0, keywords: ['recruiter'] },
      { id: 'cto',       name: 'CTO',       colorIndex: 1, keywords: ['\\bcto\\b'] },
    ];
  });

  test('injects a badge for a matching title', () => {
    buildPeoplePage([buildCard('Senior Recruiter')]);
    highlighter.highlight();

    expect(document.querySelector('.lkd-role-badge')).not.toBeNull();
    expect(document.querySelector('.lkd-role-badge').textContent).toBe('Recruiter');
  });

  test('sets data-lkd-highlighted on the card after injection', () => {
    const card = buildCard('Senior Recruiter');
    buildPeoplePage([card]);
    highlighter.highlight();

    expect(card.getAttribute('data-lkd-highlighted')).toBe('true');
  });

  test('does not inject a badge for a non-matching title', () => {
    buildPeoplePage([buildCard('Software Engineer')]);
    highlighter.highlight();

    expect(document.querySelector('.lkd-role-badge')).toBeNull();
  });

  test('does not re-process an already-highlighted card', () => {
    const card = buildCard('Senior Recruiter');
    card.setAttribute('data-lkd-highlighted', 'true');
    buildPeoplePage([card]);
    highlighter.highlight();

    // No badge should be added because the guard exits early
    expect(document.querySelector('.lkd-role-badge')).toBeNull();
  });

  test('does not inject when enabled is false', () => {
    highlighter.enabled = false;
    buildPeoplePage([buildCard('Senior Recruiter')]);
    highlighter.highlight();

    expect(document.querySelector('.lkd-role-badge')).toBeNull();
  });

  test('does not run on non-People pages', () => {
    buildPeoplePage([buildCard('Senior Recruiter')]);
    // Override the URL set by buildPeoplePage to a non-People page
    window.location = { href: 'https://www.linkedin.com/feed/' };
    highlighter.highlight();

    expect(document.querySelector('.lkd-role-badge')).toBeNull();
  });

  test('skips cards without a /in/ profile link', () => {
    buildPeoplePage([buildCard('Senior Recruiter', false)]);
    highlighter.highlight();

    expect(document.querySelector('.lkd-role-badge')).toBeNull();
  });

  test('injects the correct category name for each match', () => {
    buildPeoplePage([buildCard('CTO'), buildCard('Recruiter Lead')]);
    highlighter.highlight();

    const badges = document.querySelectorAll('.lkd-role-badge');
    const names = Array.from(badges).map((b) => b.textContent);
    expect(names).toContain('CTO');
    expect(names).toContain('Recruiter');
  });
});
