// ── LinkedIn People Page Selector Diagnostic ──────────────────────────────
// Paste into DevTools Console on a /company/{slug}/people page.
// Scroll so employee cards (with photos + names) are visible before running.

(function diagnose() {

  // ── 1. Find person lockups (size-7 + /in/ link) ───────────────────────
  const allLockups = document.querySelectorAll('.artdeco-entity-lockup');
  const personLockups = Array.from(allLockups).filter(el =>
    el.querySelector('a[href*="/in/"]')
  );

  console.log('artdeco-entity-lockup with /in/ link:', personLockups.length);
  if (personLockups.length === 0) {
    console.warn('No person cards found. Scroll to load employee cards, then re-run.');
    return;
  }

  // Size distribution (helps identify which size class is used for people)
  const sizeCounts = {};
  allLockups.forEach(el => {
    const size = [...el.classList].find(c => c.includes('size')) || 'no-size';
    sizeCounts[size] = (sizeCounts[size] || 0) + 1;
  });
  console.log('Size class distribution:', sizeCounts);

  const first = personLockups[0];
  const sizeClass = [...first.classList].find(c => c.includes('size')) || '?';

  // ── 2. Test title selectors on first person card ───────────────────────
  const titleSelectors = [
    '.artdeco-entity-lockup__subtitle',
    '.artdeco-entity-lockup__caption',
    '[class*="subtitle"]',
    '[class*="caption"]',
    'div.t-14',
    '.t-14',
    '.t-normal',
  ];

  console.group(`── Title selectors inside first person card (${sizeClass}) ──`);
  titleSelectors.forEach(sel => {
    try {
      const el = first.querySelector(sel);
      console.log(el ? '✅' : '❌', `"${sel}"`, '→',
        el ? `"${el.textContent.trim().slice(0, 80)}"` : 'no match');
    } catch (e) { console.log('⚠️', sel); }
  });
  console.groupEnd();

  // ── 3. Text of first 5 person cards ────────────────────────────────────
  console.group('── First 5 person card texts ──');
  personLockups.slice(0, 5).forEach((card, i) => {
    const lines = (card.textContent || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 4);
    console.log(`[${i}]`, lines);
  });
  console.groupEnd();

  // ── 4. Full HTML of first person card ──────────────────────────────────
  console.group('── First person card outer HTML (first 2000 chars) ──');
  console.log(first.outerHTML.slice(0, 2000));
  console.groupEnd();

})();
