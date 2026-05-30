/**
 * Popup controller for LinkedIn People Page Tracker.
 *
 * Handles data loading, storage operations, and wires user-driven actions to
 * PopupView (popup-view.js), which owns all DOM creation and mutation.
 */

/* global PopupView, getHighlightingSettings, setHighlightingSettings,
          getMemberHiderSettings, setMemberHiderSettings,
          getInvitationStats, getWithdrawnStats, getSeenCompanies, setSeenCompanies,
          getProspectScorerSettings, setProspectScorerSettings,
          BADGE_PALETTE, chrome */

/** @type {PopupView} */
let _view;

async function loadPopup() {
    _view = new PopupView({
        onReorder: reorderCategories,
        onColorSelect: updateCategoryColor,
        onDeleteConfirm: deleteCategory,
        onEdit: (catId) => {
            getHighlightingSettings().then((settings) => {
                const category = settings.categories.find((c) => c.id === catId);
                if (category) 
                    _view.openCategoryForm(category);
            });
        },
        onDeleteSearchStringConfirm: deleteSearchString,
        onEditSearchString: (strId) => {
            getSearchStrings().then(({ strings }) => {
                const entry = strings.find((s) => s.id === strId);
                if (entry)
                    _view.openSearchStringForm(entry);
            });
        },
    });

    await loadHighlightingSettings();
    await loadSearchStrings();
    await loadInvitationStats();
    await loadProspectScorerSettings();
    
    setupEventListeners();
}

async function loadSearchStrings() {
    const { strings } = await getSearchStrings();
    _view.renderSearchStringList(strings);
}

function saveSearchStringForm() {
    const { label, value } = _view.getSearchStringFormValues();
    if (!value) {
        _view.showNotification('String value is required.', true);
        return;
    }

    const { editingSearchStringId } = _view;
    upsertSearchString(editingSearchStringId, label, value, () => {
        _view.closeSearchStringForm();
        _view.showNotification(editingSearchStringId ? 'String updated.' : 'String added.');
    });
}

function upsertSearchString(id, label, value, callback) {
    getSearchStrings().then(({ strings }) => {
        const list = [...strings];
        if (id) {
            const idx = list.findIndex((s) => s.id === id);
            if (idx !== -1)
                list[idx] = { ...list[idx], label, value };
        } else {
            list.push({ id: `str_${Date.now()}`, label, value });
        }

        return setSearchStrings({ strings: list }).then(() => {
            _view.renderSearchStringList(list);
            if (callback)
                callback();
        });
    });
}

function deleteSearchString(id) {
    getSearchStrings().then(({ strings }) => {
        const list = strings.filter((s) => s.id !== id);
        return setSearchStrings({ strings: list }).then(() => {
            _view.closeSearchStringDeleteConfirm();
            _view.renderSearchStringList(list);
            _view.showNotification('String deleted.');
        });
    });
}

async function loadHighlightingSettings() {
    const [settings, memberSettings] = await Promise.all([
        getHighlightingSettings(),
        getMemberHiderSettings(),
    ]);

    document.getElementById('highlightingToggle').checked = settings.enabled;
    document.getElementById('hideUnreachableToggle').checked = memberSettings.hideUnreachable;
    _view.renderCategoryList(settings.categories);
}

function toggleHighlighting(event) {
    const enabled = event.target.checked;
    setHighlightingSettings({ enabled }).then(() => {
        _view.showNotification(enabled ? 'Highlighting enabled on People pages' : 'Highlighting disabled');
    });
}

function toggleHideUnreachable(event) {
    const hideUnreachable = event.target.checked;
    setMemberHiderSettings({ hideUnreachable }).then(() => {
        _view.showNotification(
            hideUnreachable
                ? '"LinkedIn Member" profiles will be hidden'
                : '"LinkedIn Member" profiles will be shown'
        );
    });
}

async function loadProspectScorerSettings() {
    const settings = await getProspectScorerSettings();
    document.getElementById('minFollowersInput').value = settings.minFollowers;
    document.getElementById('maxCompanyYearsInput').value = settings.maxCompanyYears;
}

function saveProspectScorerSettings() {
    const rawFollowers = parseInt(document.getElementById('minFollowersInput').value, 10);
    const minFollowers = isNaN(rawFollowers) || rawFollowers < 0 ? 0 : rawFollowers;
    const rawYears = parseInt(document.getElementById('maxCompanyYearsInput').value, 10);
    const maxCompanyYears = isNaN(rawYears) || rawYears < 1 ? 1 : rawYears;
    setProspectScorerSettings({ minFollowers, maxCompanyYears }).then(() => {
        _view.showNotification('Prospect Scorer settings saved');
    });
}

function saveCategoryForm() {
    const { name, keywords } = _view.getFormValues();
    if (!name) {
        _view.showNotification('Category name is required.', true);
        return;
    }

    const { editingCategoryId, currentCategories } = _view;
    const colorIndex = editingCategoryId
        ? (currentCategories.find((c) => c.id === editingCategoryId)?.colorIndex ?? 0)
        : nextColorIndex(currentCategories);

    upsertCategory(editingCategoryId, name, keywords, colorIndex, () => {
        _view.closeCategoryForm();
        _view.showNotification(editingCategoryId ? 'Category updated.' : 'Category added.');
    });
}

function upsertCategory(id, name, keywords, colorIndex, callback) {
    getHighlightingSettings().then((settings) => {
        const categories = [...settings.categories];
        if (id) {
            const idx = categories.findIndex((c) => c.id === id);
            if (idx !== -1) 
                categories[idx] = { ...categories[idx], name, keywords, colorIndex };
        } else {
            categories.push({ id: `cat_${Date.now()}`, name, keywords, colorIndex });
        }

        return setHighlightingSettings({ categories }).then(() => {
            _view.renderCategoryList(categories);
            if (callback) 
                callback();
        });
    });
}

function deleteCategory(id) {
    getHighlightingSettings().then((settings) => {
        const categories = settings.categories.filter((c) => c.id !== id);
        return setHighlightingSettings({ categories }).then(() => {
            _view.closeDeleteConfirm();
            _view.renderCategoryList(categories);
            _view.showNotification('Category deleted.');
        });
    });
}

function reorderCategories(fromId, toId, insertBefore) {
    getHighlightingSettings().then((settings) => {
        const categories = [...settings.categories];
        const fromIdx = categories.findIndex((c) => c.id === fromId);
        if (fromIdx === -1) 
            return;

        const [item] = categories.splice(fromIdx, 1);
        const toIdx = categories.findIndex((c) => c.id === toId);
        categories.splice(toIdx === -1 ? categories.length : (insertBefore ? toIdx : toIdx + 1), 0, item);
        
        return setHighlightingSettings({ categories }).then(() => _view.renderCategoryList(categories));
    });
}

function updateCategoryColor(id, colorIndex) {
    chrome.storage.local.get(['highlightingSettings'], (result) => {
        const settings = result.highlightingSettings || {};
        const categories = Array.isArray(settings.categories) ? [...settings.categories] : [];
        const idx = categories.findIndex((c) => c.id === id);
        if (idx !== -1) {
            categories[idx] = { ...categories[idx], colorIndex };
            chrome.storage.local.set(
                { highlightingSettings: { ...settings, categories } },
                () => _view.renderCategoryList(categories)
            );
        }
    });
}

function nextColorIndex(categories) {
    if (categories.length === 0) 
        return 0;
    const used = categories.map((c) => c.colorIndex ?? 0);
    return (Math.max(...used) + 1) % BADGE_PALETTE.length;
}

/**
 * Return the ISO date string "YYYY-MM-DD" for Monday 00:00 UTC of the week
 * that contains `date`.
 * @param {Date} date
 * @returns {string}
 */
function getWeekKey(date) {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    
    const day = utcDate.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    utcDate.setUTCDate(utcDate.getUTCDate() + diff);
    
    return utcDate.toISOString().slice(0, 10);
}

/**
 * Build an ordered array of the last `n` Monday week keys, most-recent first.
 * @param {number} weekCount
 * @returns {string[]}
 */
function getLastNWeekKeys(weekCount) {
    const keys = [];
    const now = new Date();
    for (let i = 0; i < weekCount; i++) {
        const currentDate = new Date(now);
        currentDate.setUTCDate(currentDate.getUTCDate() - i * 7);
        keys.push(getWeekKey(currentDate));
    }

    return keys;
}

async function loadInvitationStats() {
    const [stats, withdrawnStats] = await Promise.all([getInvitationStats(), getWithdrawnStats()]);
    const weeks = getLastNWeekKeys(8).reverse();
    const counts = weeks.map((k) => stats[k] || 0);
    const withdrawnCounts = weeks.map((k) => withdrawnStats[k] || 0);
    
    _view.renderInvitationChart(weeks, counts, withdrawnCounts);
}

function exportData() {
    getSeenCompanies().then((companies) => {
        const data = {
            version: 1,
            exportDate: new Date().toISOString(),
            companies: Object.values(companies),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `linkedin-tracker-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        _view.showNotification('Export successful!');
    });
}

function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) 
        return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            const companies = importedData.companies || [];

            getSeenCompanies().then((existingCompanies) => {
                companies.forEach((company) => {
                    if (!existingCompanies[company.slug]) {
                        existingCompanies[company.slug] = company;
                    }
                });
                return setSeenCompanies(existingCompanies).then(() => {
                    _view.showNotification(
                        `Imported ${companies.length} companies! (${Object.keys(existingCompanies).length} total)`
                    );
                });
            });
        } catch {
            _view.showNotification('Import failed: Invalid JSON file', true);
        }
    };

    reader.readAsText(file);
    event.target.value = '';
}

function clearAll() {
    const clearBtn = document.getElementById('clearBtn');
    _view.showClearAllConfirm(clearBtn.closest('.dropdown-item'), () => {
        setSeenCompanies({}).then(() => _view.showNotification('All companies cleared.'));
    });
}

function setupEventListeners() {
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', triggerFileInput);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('fileInput').addEventListener('change', importData);

    document.getElementById('actionsMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('actionsDropdown').classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
        document.getElementById('actionsDropdown')?.classList.add('hidden');
    });
    document.getElementById('actionsDropdown').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.getElementById('highlightingToggle').addEventListener('change', toggleHighlighting);
    document.getElementById('hideUnreachableToggle').addEventListener('change', toggleHideUnreachable);
    document.getElementById('saveProspectScorerBtn').addEventListener('click', saveProspectScorerSettings);

    document.getElementById('categoriesToggle').addEventListener('click', () => {
        const btn = document.getElementById('categoriesToggle');
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        document.getElementById('categoriesCollapsible').classList.toggle('hidden', expanded);
    });
    document.getElementById('addCategoryBtn').addEventListener('click', () => _view.openCategoryForm());
    document.getElementById('saveCategoryBtn').addEventListener('click', saveCategoryForm);
    document.getElementById('cancelCategoryBtn').addEventListener('click', () => _view.closeCategoryForm());
    document.getElementById('categoriesList').addEventListener('click', (e) => _view.onCategoryListClick(e));

    document.getElementById('searchStringsToggle').addEventListener('click', () => {
        const btn = document.getElementById('searchStringsToggle');
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        document.getElementById('searchStringsCollapsible').classList.toggle('hidden', expanded);
    });
    document.getElementById('addSearchStringBtn').addEventListener('click', () => _view.openSearchStringForm());
    document.getElementById('saveSearchStringBtn').addEventListener('click', saveSearchStringForm);
    document.getElementById('cancelSearchStringBtn').addEventListener('click', () => _view.closeSearchStringForm());
    document.getElementById('searchStringsList').addEventListener('click', (e) => _view.onSearchStringListClick(e));
}

document.addEventListener('DOMContentLoaded', loadPopup);
