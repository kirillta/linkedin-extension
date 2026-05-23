/**
 * DOM snapshot tests: MemberHider
 *
 * These tests use a synthetic HTML fixture that mirrors LinkedIn's People page
 * structure as of May 2026. They will need updating when LinkedIn changes its
 * markup — that's the signal they are designed to give.
 *
 * Selector verified: .artdeco-entity-lockup (May 2026)
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');
loadScript('member-hider.js');

function buildPeoplePage(cards) {
  // cards: array of { name: string }
  document.body.innerHTML = '';
  // MemberHider.run() guards on window.location — point jsdom at the right path
  Object.defineProperty(window, 'location', {
    value: { href: 'https://www.linkedin.com/company/acme/people' },
    writable: true,
  });

  const ul = document.createElement('ul');
  for (const { name } of cards) {
    const li = document.createElement('li');
    const card = document.createElement('div');
    card.className = 'artdeco-entity-lockup';
    card.textContent = name;
    li.appendChild(card);
    ul.appendChild(li);
  }
  document.body.appendChild(ul);
}

describe('MemberHider DOM — marking anonymous cards', () => {
  test('marks "LinkedIn Member" cards with data-lkd-unreachable', () => {
    buildPeoplePage([
      { name: 'LinkedIn Member' },
      { name: 'Jane Doe' },
    ]);

    const hider = new MemberHider();
    hider.enabled = false;
    hider.run();

    const cards = document.querySelectorAll('.artdeco-entity-lockup');
    expect(cards[0].getAttribute('data-lkd-unreachable')).toBe('true');
    expect(cards[1].getAttribute('data-lkd-unreachable')).toBeNull();
  });

  test('matching is case-insensitive', () => {
    buildPeoplePage([{ name: 'linkedin member' }]);

    const hider = new MemberHider();
    hider.enabled = false;
    hider.run();

    expect(
      document.querySelector('.artdeco-entity-lockup').getAttribute('data-lkd-unreachable')
    ).toBe('true');
  });
});

describe('MemberHider DOM — hiding and showing', () => {
  beforeEach(() => {
    buildPeoplePage([
      { name: 'LinkedIn Member' },
      { name: 'Jane Doe' },
    ]);
  });

  test('enabled=true hides anonymous cards and their list items', () => {
    const hider = new MemberHider();
    hider.enabled = true;
    hider.run();

    const card = document.querySelectorAll('.artdeco-entity-lockup')[0];
    const li = card.closest('li');
    expect(card.style.display).toBe('none');
    expect(li.style.display).toBe('none');
  });

  test('enabled=true does not hide non-anonymous cards', () => {
    const hider = new MemberHider();
    hider.enabled = true;
    hider.run();

    const card = document.querySelectorAll('.artdeco-entity-lockup')[1];
    expect(card.style.display).not.toBe('none');
  });

  test('enabled=false shows previously hidden cards', () => {
    const hider = new MemberHider();
    hider.enabled = true;
    hider.run();

    hider.enabled = false;
    hider.run();

    const card = document.querySelectorAll('.artdeco-entity-lockup')[0];
    expect(card.style.display).toBe('');
  });

  test('does not run on non-People pages', () => {
    window.location = { href: 'https://www.linkedin.com/company/acme/about' };

    const hider = new MemberHider();
    hider.enabled = true;
    hider.run();

    // No cards should be hidden because the URL guard returns early
    const card = document.querySelectorAll('.artdeco-entity-lockup')[0];
    expect(card.getAttribute('data-lkd-unreachable')).toBeNull();
  });
});
