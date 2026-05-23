// ── Storage key constants ─────────────────────────────────────────────────

/**
 * Single source of truth for all chrome.storage.local key names.
 * Reference SK.* everywhere instead of bare string literals.
 */
const SK = {
    HIGHLIGHTING: 'highlightingSettings',
    MEMBER_HIDER: 'memberHiderSettings',
    SEEN_COMPANIES: 'seenCompanies',
    INVITATION_STATS: 'invitationStats',
    WITHDRAWN_STATS: 'withdrawnInvitationStats',
    SEARCH_STRINGS: 'searchStrings',
};

// Each getter always resolves with a well-shaped object — callers never need
// to apply their own defaults or handle undefined fields.

/** @returns {Promise<{enabled: boolean, categories: Array}>} */
function getHighlightingSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SK.HIGHLIGHTING], (result) => {
            const storageKey = result[SK.HIGHLIGHTING] || {};
            resolve({
                enabled: storageKey.enabled !== false,
                categories: Array.isArray(storageKey.categories) ? storageKey.categories : [],
            });
        });
    });
}

/** @returns {Promise<{hideUnreachable: boolean}>} */
function getMemberHiderSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SK.MEMBER_HIDER], (result) => {
            const storageKey = result[SK.MEMBER_HIDER] || {};
            resolve({ 
                hideUnreachable: storageKey.hideUnreachable === true 
            });
        });
    });
}

/** @returns {Promise<Object>} Map of slug → {slug, name, firstSeen} */
function getSeenCompanies() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SK.SEEN_COMPANIES], (result) => {
            resolve(result[SK.SEEN_COMPANIES] || {});
        });
    });
}

/** @returns {Promise<Object>} Map of weekKey → count */
function getInvitationStats() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SK.INVITATION_STATS], (result) => {
            resolve(result[SK.INVITATION_STATS] || {});
        });
    });
}

/** @returns {Promise<Object>} Map of weekKey → count */
function getWithdrawnStats() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SK.WITHDRAWN_STATS], (result) => {
            resolve(result[SK.WITHDRAWN_STATS] || {});
        });
    });
}

/**
 * Merge `patch` into the current highlightingSettings.
 * Read-modify-write prevents any writer from clobbering fields it doesn't own.
 * @param {Partial<{enabled: boolean, categories: Array}>} patch
 */
async function setHighlightingSettings(patch) {
    const current = await getHighlightingSettings();
    return new Promise((resolve) => {
        chrome.storage.local.set({ [SK.HIGHLIGHTING]: { ...current, ...patch } }, resolve);
    });
}

/**
 * Merge `patch` into the current memberHiderSettings.
 * @param {Partial<{hideUnreachable: boolean}>} patch
 */
async function setMemberHiderSettings(patch) {
    const current = await getMemberHiderSettings();
    return new Promise((resolve) => {
        chrome.storage.local.set({ [SK.MEMBER_HIDER]: { ...current, ...patch } }, resolve);
    });
}

/**
 * Replace the full seenCompanies map.
 * @param {Object} companies
 */
function setSeenCompanies(companies) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [SK.SEEN_COMPANIES]: companies }, resolve);
    });
}

/**
 * Replace the full invitationStats map.
 * @param {Object} stats
 */
function setInvitationStats(stats) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [SK.INVITATION_STATS]: stats }, resolve);
    });
}

/**
 * Replace the full withdrawnInvitationStats map.
 * @param {Object} stats
 */
function setWithdrawnStats(stats) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [SK.WITHDRAWN_STATS]: stats }, resolve);
    });
}

/** @returns {Promise<{strings: Array<{id: string, label: string, value: string}>}>} */
function getSearchStrings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SK.SEARCH_STRINGS], (result) => {
            const stored = result[SK.SEARCH_STRINGS] || {};
            resolve({
                strings: Array.isArray(stored.strings) ? stored.strings : [],
            });
        });
    });
}

/**
 * Merge `patch` into the current searchStrings settings.
 * @param {Partial<{strings: Array}>} patch
 */
async function setSearchStrings(patch) {
    const current = await getSearchStrings();
    return new Promise((resolve) => {
        chrome.storage.local.set({ [SK.SEARCH_STRINGS]: { ...current, ...patch } }, resolve);
    });
}

/**
 * One-time migration: extract hideUnreachable out of highlightingSettings
 * into its own memberHiderSettings key.
 *
 * Safe to call multiple times — no-op if already migrated.
 */
async function migrateStorage() {
    const result = await chrome.storage.local.get(['highlightingSettings', 'memberHiderSettings']);
    if (result.memberHiderSettings !== undefined)
        return;

    const old = result.highlightingSettings || {};
    const hideUnreachable = old.hideUnreachable ?? false;
    const newHighlighting = { ...old };
    
    delete newHighlighting.hideUnreachable;
    await chrome.storage.local.set({
        highlightingSettings: newHighlighting,
        memberHiderSettings: { hideUnreachable },
    });
}
