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
    PROSPECT_SCORER: 'prospectScorerSettings',
};

// ── Generic helpers ───────────────────────────────────────────────────────

// Each public getter always resolves with a well-shaped object — callers never
// need to apply their own defaults or handle undefined fields.

function getFromStorage(key, defaults = {}) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve({ ...defaults, ...(result[key] || {}) });
        });
    });
}

async function mergeIntoStorage(key, getter, patch) {
    const current = await getter();
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: { ...current, ...patch } }, resolve);
    });
}

function replaceInStorage(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
    });
}

// ── Public API ────────────────────────────────────────────────────────────

/** @returns {Promise<{enabled: boolean, categories: Array}>} */
function getHighlightingSettings() {
    return getFromStorage(SK.HIGHLIGHTING, { enabled: true, categories: [] });
}

/** @returns {Promise<{hideUnreachable: boolean}>} */
function getMemberHiderSettings() {
    return getFromStorage(SK.MEMBER_HIDER, { hideUnreachable: false });
}

/** @returns {Promise<Object>} Map of slug → {slug, name, firstSeen} */
function getSeenCompanies() {
    return getFromStorage(SK.SEEN_COMPANIES);
}

/** @returns {Promise<Object>} Map of weekKey → count */
function getInvitationStats() {
    return getFromStorage(SK.INVITATION_STATS);
}

/** @returns {Promise<Object>} Map of weekKey → count */
function getWithdrawnStats() {
    return getFromStorage(SK.WITHDRAWN_STATS);
}

/** @returns {Promise<{strings: Array<{id: string, label: string, value: string}>}>} */
function getSearchStrings() {
    return getFromStorage(SK.SEARCH_STRINGS, { strings: [] });
}

/**
 * Merge `patch` into the current highlightingSettings.
 * Read-modify-write prevents any writer from clobbering fields it doesn't own.
 * @param {Partial<{enabled: boolean, categories: Array}>} patch
 */
function setHighlightingSettings(patch) {
    return mergeIntoStorage(SK.HIGHLIGHTING, getHighlightingSettings, patch);
}

/**
 * Merge `patch` into the current memberHiderSettings.
 * @param {Partial<{hideUnreachable: boolean}>} patch
 */
function setMemberHiderSettings(patch) {
    return mergeIntoStorage(SK.MEMBER_HIDER, getMemberHiderSettings, patch);
}

/**
 * Replace the full seenCompanies map.
 * @param {Object} companies
 */
function setSeenCompanies(companies) {
    return replaceInStorage(SK.SEEN_COMPANIES, companies);
}

/**
 * Replace the full invitationStats map.
 * @param {Object} stats
 */
function setInvitationStats(stats) {
    return replaceInStorage(SK.INVITATION_STATS, stats);
}

/**
 * Replace the full withdrawnInvitationStats map.
 * @param {Object} stats
 */
function setWithdrawnStats(stats) {
    return replaceInStorage(SK.WITHDRAWN_STATS, stats);
}

/**
 * Merge `patch` into the current searchStrings settings.
 * @param {Partial<{strings: Array}>} patch
 */
function setSearchStrings(patch) {
    return mergeIntoStorage(SK.SEARCH_STRINGS, getSearchStrings, patch);
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

/** @returns {Promise<{minFollowers: number, maxCompanyYears: number}>} */
function getProspectScorerSettings() {
    return getFromStorage(SK.PROSPECT_SCORER, { minFollowers: 100, maxCompanyYears: 8 });
}

/**
 * Merge `patch` into the current prospectScorerSettings.
 * @param {Partial<{minFollowers: number, maxCompanyYears: number}>} patch
 */
function setProspectScorerSettings(patch) {
    return mergeIntoStorage(SK.PROSPECT_SCORER, getProspectScorerSettings, patch);
}
