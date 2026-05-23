/**
 * Background service worker for LinkedIn People Page Tracker.
 * Manages the "Add to keyword category" context menu and handles keyword insertion.
 */

importScripts('./storage-utils.js');

const ROOT_MENU_ID = 'lkd-add-keyword-root';
const INSERT_MENU_ID = 'lkd-insert-string-root';
const INSERT_PREFIX = `${INSERT_MENU_ID}__str__`;
const LINKEDIN_URL_PATTERN = 'https://www.linkedin.com/*';
const MSG_INSERT_STRING = 'lkd-insert-string';
const MSG_KEYWORD_ADD_RESULT = 'lkd-keyword-add-result';

/**
 * Normalize selected text into a keyword: trim and lowercase.
 * The result is a plain string that works as a literal regex pattern.
 * @param {string} text
 * @returns {string}
 */
function normalizeKeyword(text) {
    return text.trim().toLowerCase();
}

async function _buildKeywordCategorySubmenu(categories) {
    await chrome.contextMenus.create({
        id: ROOT_MENU_ID,
        title: 'Add to keyword category',
        contexts: ['selection'],
        documentUrlPatterns: [LINKEDIN_URL_PATTERN],
    });

    if (categories.length === 0) {
        await chrome.contextMenus.create({
            id: `${ROOT_MENU_ID}__empty`,
            parentId: ROOT_MENU_ID,
            title: '(No categories — create one in the popup)',
            contexts: ['selection'],
            enabled: false,
            documentUrlPatterns: [LINKEDIN_URL_PATTERN],
        });
    } else {
        for (const cat of categories) {
            await chrome.contextMenus.create({
                id: `${ROOT_MENU_ID}__cat__${cat.id}`,
                parentId: ROOT_MENU_ID,
                title: cat.name,
                contexts: ['selection'],
                documentUrlPatterns: [LINKEDIN_URL_PATTERN],
            });
        }
    }
}

async function _buildInsertStringSubmenu(strings) {
    await chrome.contextMenus.create({
        id: INSERT_MENU_ID,
        title: 'Insert search string',
        contexts: ['editable'],
        documentUrlPatterns: [LINKEDIN_URL_PATTERN],
    });

    if (strings.length === 0) {
        await chrome.contextMenus.create({
            id: `${INSERT_MENU_ID}__empty`,
            parentId: INSERT_MENU_ID,
            title: '(No search strings — add them in the popup)',
            contexts: ['editable'],
            enabled: false,
            documentUrlPatterns: [LINKEDIN_URL_PATTERN],
        });
    } else {
        for (const str of strings) {
            await chrome.contextMenus.create({
                id: `${INSERT_PREFIX}${str.id}`,
                parentId: INSERT_MENU_ID,
                title: str.label || str.value,
                contexts: ['editable'],
                documentUrlPatterns: [LINKEDIN_URL_PATTERN],
            });
        }
    }
}

/**
 * Rebuild the context menu subtree from the current stored categories.
 * Called on install, startup, and whenever highlightingSettings changes.
 * Uses a guard to prevent concurrent rebuilds from racing.
 */
let _rebuildPending = false;

async function rebuildContextMenu() {
    if (_rebuildPending) 
        return;

    _rebuildPending = true;
    try {
        await chrome.contextMenus.removeAll();

        const [{ categories }, { strings }] = await Promise.all([
            getHighlightingSettings(),
            getSearchStrings(),
        ]);

        await _buildKeywordCategorySubmenu(categories);
        await _buildInsertStringSubmenu(strings);
    } catch (err) {
        console.error('[LinkedIn Tracker] rebuildContextMenu failed:', err);
    } finally {
        _rebuildPending = false;
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    await migrateStorage();
    rebuildContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
    await migrateStorage();
    rebuildContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.highlightingSettings || changes.searchStrings))
        rebuildContextMenu();
});

const CAT_PREFIX = `${ROOT_MENU_ID}__cat__`;

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId.startsWith(INSERT_PREFIX)) {
        const strId = info.menuItemId.slice(INSERT_PREFIX.length);
        const { strings } = await getSearchStrings();
        const entry = strings.find((s) => s.id === strId);
        if (!entry) 
            return;

        chrome.tabs.sendMessage(tab.id, {
            type: MSG_INSERT_STRING,
            value: entry.value,
        });

        return;
    }

    if (!info.menuItemId.startsWith(CAT_PREFIX))
        return;

    const catId = info.menuItemId.slice(CAT_PREFIX.length);
    const keyword = normalizeKeyword(info.selectionText || '');
    if (!keyword)
        return;

    const settings = await getHighlightingSettings();
    const categories = [...settings.categories];

    const catIdx = categories.findIndex((c) => c.id === catId);
    if (catIdx === -1)
        return;

    const cat = { ...categories[catIdx] };
    const keywords = [...(cat.keywords || [])];

    if (keywords.includes(keyword)) {
        chrome.tabs.sendMessage(tab.id, {
            type: MSG_KEYWORD_ADD_RESULT,
            success: false,
            reason: 'duplicate',
            keyword,
            categoryName: cat.name,
        });

        return;
    }

    keywords.push(keyword);
    cat.keywords = keywords;
    categories[catIdx] = cat;

    await setHighlightingSettings({ categories });
    chrome.tabs.sendMessage(tab.id, {
        type: MSG_KEYWORD_ADD_RESULT,
        success: true,
        keyword,
        categoryName: cat.name,
    });
});
