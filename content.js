/**
 * LinkedIn People Page Tracker — Orchestrator
 */

const companyTracker = new CompanyTracker();
const roleHighlighter = new RoleHighlighter();
const memberHider = new MemberHider();
const connectPromoter = new ConnectPromoter();
const invitationTracker = new InvitationTracker();
const withdrawalTracker = new WithdrawalTracker();
const prospectScorer = new ProspectScorer();

// Features that participate in the run/onStorageChanged cycle.
// InvitationTracker is event-driven (init()) and excluded from this array.
const FEATURES = [companyTracker, roleHighlighter, memberHider, connectPromoter, prospectScorer];

let lastUrl = window.location.href;
let injectionTimeout = null;
let injectionMaxTimeout = null;

let _lastRightClickTarget = null;
let _lastSelectionStart = 0;
let _lastSelectionEnd = 0;

async function init() {
    await migrateStorage();
    await companyTracker.load();
    await roleHighlighter.loadSettings();
    await memberHider.loadSettings();
    await prospectScorer.loadSettings();
    invitationTracker.init();
    withdrawalTracker.init();

    document.addEventListener('contextmenu', (e) => {
        _lastRightClickTarget = e.target;
        _lastSelectionStart = e.target.selectionStart ?? 0;
        _lastSelectionEnd = e.target.selectionEnd ?? 0;
    }, { capture: true });

    // Save on direct loads / refreshes — onUrlChange only fires on URL *changes*,
    // so all-anonymous people pages (where LinkedIn never tweaks the URL after load)
    // were never recorded.
    const initMatch = window.location.href.match(/linkedin\.com\/company\/([^/?]+)\/people/);
    if (initMatch) 
        await companyTracker.save(companyTracker.normalizeSlug(initMatch[1]));

    watchUrlChanges();
    startBadgeInjection();
    chrome.storage.onChanged.addListener(onStorageChanged);
}

function watchUrlChanges() {
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            onUrlChange(currentUrl);
        }
    }, 500);
}

async function onUrlChange(url) {
    const peopleMatch = url.match(/linkedin\.com\/company\/([^/?]+)\/people/);
    if (peopleMatch) {
        const slug = companyTracker.normalizeSlug(peopleMatch[1]);
        await companyTracker.save(slug);
    }

    companyTracker.injectHeaderBadge();
    companyTracker.badgeSearchResultCards();

    // On search pages, LinkedIn may still be rendering cards when this fires.
    // Re-run after a short delay to badge any cards that appeared after the
    // initial call, and to pick up any company just saved in a concurrent
    // onUrlChange(peopleUrl) call.
    if (url.includes('/search/results/companies/')) {
        setTimeout(() => companyTracker.badgeSearchResultCards(), 1500);
    }
}

function startBadgeInjection() {
    function runInjection() {
        clearTimeout(injectionTimeout);
        clearTimeout(injectionMaxTimeout);
        injectionTimeout = null;
        injectionMaxTimeout = null;

        for (const feature of FEATURES) {
            try {
                feature.run();
            } catch (err) {
                console.error(`[lkd:${feature.constructor.name}] run error:`, err);
            }
        }
    }

    const observer = new MutationObserver(() => {
        clearTimeout(injectionTimeout);
        injectionTimeout = setTimeout(runInjection, 100);
        
        if (!injectionMaxTimeout)
            injectionMaxTimeout = setTimeout(runInjection, 2000);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    runInjection();
}

async function onStorageChanged(changes, areaName) {
    if (areaName !== 'local') 
        return;

    for (const feature of FEATURES) {
        try {
            await feature.onStorageChanged?.(changes);
        } catch (err) {
            console.error(`[lkd:${feature.constructor.name}] onStorageChanged error:`, err);
        }
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'lkd-insert-string') {
        const el = _lastRightClickTarget;
        if (!el || typeof el.focus !== 'function') 
            return;
        
        el.focus();
        if (typeof el.setSelectionRange === 'function')
            el.setSelectionRange(_lastSelectionStart, _lastSelectionEnd);

        document.execCommand('insertText', false, msg.value);

        for (const type of ['keydown', 'keypress', 'keyup']) {
            el.dispatchEvent(new KeyboardEvent(type, {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
                composed: true,
            }));
        }

        // Fallback: if the input is inside a <form>, request a submit so that
        // LinkedIn's React handler picks it up even when it ignores key events.
        const form = el.closest('form');
        if (form) {
            try {
                form.requestSubmit();
            } catch {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        }

        return;
    }

    if (msg.type !== 'lkd-keyword-add-result') 
        return;
    
    if (msg.success) 
        showLkdToast(`Added "${msg.keyword}" to ${msg.categoryName}`);
    else
        showLkdToast(`"${msg.keyword}" is already in ${msg.categoryName}`, true);
});

let _lkdToastTimer = null;

function showLkdToast(message, isWarning = false) {
    let toast = document.getElementById('lkd-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'lkd-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'lkd-toast-visible' + (isWarning ? ' lkd-toast-warning' : '');

    clearTimeout(_lkdToastTimer);
    _lkdToastTimer = setTimeout(() => {
        toast.className = '';
    }, 3000);
}

if (document.readyState === 'loading') 
    document.addEventListener('DOMContentLoaded', init);
else
    init();
