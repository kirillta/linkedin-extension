/**
 * DOM tests for PopupView (popup-view.js)
 *
 * Builds a minimal HTML fixture that mirrors the elements PopupView reads and
 * mutates, then exercises each public method directly.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('palette.js');
loadScript('category-list-view.js');
loadScript('invitation-chart-view.js');
loadScript('popup-view.js');

// ── Fixtures ──────────────────────────────────────────────────────────────

/** Minimum HTML required by PopupView methods. */
function buildDOM() {
    document.body.innerHTML = `
        <button id="categoriesToggle" aria-expanded="false"></button>
        <div id="categoriesCollapsible" class="hidden">
            <div id="categoriesList"></div>
            <div id="categoryForm" class="category-form hidden">
                <input type="text" id="categoryName" />
                <textarea id="categoryKeywords"></textarea>
            </div>
        </div>
        <div id="invitationStatsList"></div>
        <div id="actionsDropdown" class="hidden"></div>
    `;
}

function makeHandlers() {
    return {
        onReorder:       vi.fn(),
        onColorSelect:   vi.fn(),
        onEdit:          vi.fn(),
        onDeleteConfirm: vi.fn(),
    };
}

const CAT_A = { id: 'cat_1', name: 'Engineer',  colorIndex: 0, keywords: ['engineer', 'dev'] };
const CAT_B = { id: 'cat_2', name: 'Recruiter', colorIndex: 1, keywords: [] };

// ── renderCategoryList ────────────────────────────────────────────────────

describe('PopupView — renderCategoryList', () => {
    let view;
    beforeEach(() => { buildDOM(); view = new PopupView(makeHandlers()); });

    test('renders one row per category', () => {
        view.renderCategoryList([CAT_A, CAT_B]);
        expect(document.querySelectorAll('.category-row').length).toBe(2);
    });

    test('each row has correct data-id and displayed name', () => {
        view.renderCategoryList([CAT_A, CAT_B]);
        const rows = document.querySelectorAll('.category-row');
        expect(rows[0].dataset.id).toBe('cat_1');
        expect(rows[0].querySelector('.category-name').textContent).toBe('Engineer');
        expect(rows[1].dataset.id).toBe('cat_2');
        expect(rows[1].querySelector('.category-name').textContent).toBe('Recruiter');
    });

    test('kw-count shows correct keyword count', () => {
        view.renderCategoryList([CAT_A]);
        expect(document.querySelector('.kw-count').textContent).toBe('2 kw');
    });

    test('kw-count shows 0 for a category with no keywords', () => {
        view.renderCategoryList([CAT_B]);
        expect(document.querySelector('.kw-count').textContent).toBe('0 kw');
    });

    test('rows are draggable', () => {
        view.renderCategoryList([CAT_A]);
        expect(document.querySelector('.category-row').draggable).toBe(true);
    });

    test('each row contains edit and delete action buttons', () => {
        view.renderCategoryList([CAT_A]);
        expect(document.querySelector('[data-action="edit"][data-id="cat_1"]')).not.toBeNull();
        expect(document.querySelector('[data-action="delete"][data-id="cat_1"]')).not.toBeNull();
    });

    test('each row contains a color swatch button', () => {
        view.renderCategoryList([CAT_A]);
        expect(document.querySelector('[data-action="color"][data-id="cat_1"]')).not.toBeNull();
    });

    test('shows placeholder text when list is empty', () => {
        view.renderCategoryList([]);
        const list = document.getElementById('categoriesList');
        expect(list.querySelector('p').textContent).toContain('No categories');
        expect(document.querySelectorAll('.category-row').length).toBe(0);
    });

    test('updates currentCategories', () => {
        view.renderCategoryList([CAT_A, CAT_B]);
        expect(view.currentCategories).toEqual([CAT_A, CAT_B]);
    });

    test('re-render replaces previous content', () => {
        view.renderCategoryList([CAT_A, CAT_B]);
        view.renderCategoryList([CAT_A]);
        expect(document.querySelectorAll('.category-row').length).toBe(1);
    });
});

// ── DnD reorder ───────────────────────────────────────────────────────────

describe('PopupView — drag-and-drop reorder', () => {
    let view, handlers;
    beforeEach(() => { buildDOM(); handlers = makeHandlers(); view = new PopupView(handlers); });

    test('ondrop calls onReorder with fromId, toId and insertBefore flag', () => {
        view.renderCategoryList([CAT_A, CAT_B]);
        const list = document.getElementById('categoriesList');
        const rows = document.querySelectorAll('.category-row');

        // jsdom does not implement DragEvent; drive the handler directly.
        // Simulate dragstart: set the internal dragged-id by calling ondragstart.
        const mockDragstart = { target: rows[0], dataTransfer: { effectAllowed: '' } };
        list.ondragstart(mockDragstart);

        // Mark the drop target as bottom-half (insertBefore = false)
        rows[1].classList.add('drag-over-bottom');
        const mockDrop = {
            preventDefault: () => {},
            target: rows[1],
        };
        list.ondrop(mockDrop);

        expect(handlers.onReorder).toHaveBeenCalledWith('cat_1', 'cat_2', false);
    });
});

// ── openCategoryForm / closeCategoryForm ──────────────────────────────────

describe('PopupView — openCategoryForm / closeCategoryForm', () => {
    let view;
    beforeEach(() => { buildDOM(); view = new PopupView(makeHandlers()); });

    test('openCategoryForm() shows empty form for a new category', () => {
        view.openCategoryForm();
        expect(document.getElementById('categoryForm').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('categoryName').value).toBe('');
        expect(document.getElementById('categoryKeywords').value).toBe('');
        expect(view.editingCategoryId).toBeNull();
    });

    test('openCategoryForm(cat) populates name and keywords', () => {
        view.openCategoryForm(CAT_A);
        expect(document.getElementById('categoryName').value).toBe('Engineer');
        expect(document.getElementById('categoryKeywords').value).toBe('engineer\ndev');
        expect(view.editingCategoryId).toBe('cat_1');
    });

    test('openCategoryForm expands the collapsible if it is hidden', () => {
        view.openCategoryForm();
        expect(document.getElementById('categoriesCollapsible').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('categoriesToggle').getAttribute('aria-expanded')).toBe('true');
    });

    test('openCategoryForm does not double-expand an already visible collapsible', () => {
        document.getElementById('categoriesCollapsible').classList.remove('hidden');
        document.getElementById('categoriesToggle').setAttribute('aria-expanded', 'true');
        view.openCategoryForm();
        // should still be visible and not toggled back
        expect(document.getElementById('categoriesCollapsible').classList.contains('hidden')).toBe(false);
    });

    test('closeCategoryForm hides the form and clears inputs', () => {
        view.openCategoryForm(CAT_A);
        view.closeCategoryForm();
        expect(document.getElementById('categoryForm').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('categoryName').value).toBe('');
        expect(document.getElementById('categoryKeywords').value).toBe('');
    });

    test('closeCategoryForm resets editingCategoryId to null', () => {
        view.openCategoryForm(CAT_A);
        view.closeCategoryForm();
        expect(view.editingCategoryId).toBeNull();
    });
});

// ── getFormValues ─────────────────────────────────────────────────────────

describe('PopupView — getFormValues', () => {
    let view;
    beforeEach(() => { buildDOM(); view = new PopupView(makeHandlers()); });

    test('returns trimmed name and split keywords', () => {
        document.getElementById('categoryName').value = '  Developer  ';
        document.getElementById('categoryKeywords').value = 'engineer\n  dev  \n\nbob';
        const { name, keywords } = view.getFormValues();
        expect(name).toBe('Developer');
        expect(keywords).toEqual(['engineer', 'dev', 'bob']);
    });

    test('returns empty keywords array for blank textarea', () => {
        document.getElementById('categoryName').value = 'Foo';
        document.getElementById('categoryKeywords').value = '   \n  \n';
        expect(view.getFormValues().keywords).toEqual([]);
    });

    test('returns empty name string when input is blank', () => {
        document.getElementById('categoryName').value = '   ';
        expect(view.getFormValues().name).toBe('');
    });
});

// ── showDeleteConfirm / closeDeleteConfirm ────────────────────────────────

describe('PopupView — showDeleteConfirm / closeDeleteConfirm', () => {
    let view, handlers;
    beforeEach(() => {
        buildDOM();
        handlers = makeHandlers();
        view = new PopupView(handlers);
        view.renderCategoryList([CAT_A]);
    });

    test('inserts a confirm panel with the correct catId', () => {
        const delBtn = document.querySelector('[data-action="delete"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        const panel = document.querySelector('.delete-confirm');
        expect(panel).not.toBeNull();
        expect(panel.dataset.catId).toBe('cat_1');
    });

    test('confirm Delete button calls onDeleteConfirm', () => {
        const delBtn = document.querySelector('[data-action="delete"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        // Confirm/cancel rely on onCategoryListClick delegation — drive it directly.
        const confirmBtn = document.querySelector('[data-action="confirm-delete"]');
        view.onCategoryListClick({ target: confirmBtn });
        expect(handlers.onDeleteConfirm).toHaveBeenCalledWith('cat_1');
    });

    test('Cancel button removes the panel', () => {
        const delBtn = document.querySelector('[data-action="delete"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        const cancelBtn = document.querySelector('[data-action="cancel-delete"]');
        view.onCategoryListClick({ target: cancelBtn });
        expect(document.querySelector('.delete-confirm')).toBeNull();
    });

    test('calling showDeleteConfirm for the same catId toggles the panel off', () => {
        const delBtn = document.querySelector('[data-action="delete"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        view.showDeleteConfirm(delBtn, 'cat_1');
        expect(document.querySelector('.delete-confirm')).toBeNull();
    });

    test('calling showDeleteConfirm for a different catId replaces the panel', () => {
        view.renderCategoryList([CAT_A, CAT_B]);
        const delBtnA = document.querySelectorAll('[data-action="delete"]')[0];
        const delBtnB = document.querySelectorAll('[data-action="delete"]')[1];
        view.showDeleteConfirm(delBtnA, 'cat_1');
        view.showDeleteConfirm(delBtnB, 'cat_2');
        expect(document.querySelectorAll('.delete-confirm').length).toBe(1);
        expect(document.querySelector('.delete-confirm').dataset.catId).toBe('cat_2');
    });

    test('closeDeleteConfirm removes the panel', () => {
        const delBtn = document.querySelector('[data-action="delete"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        view.closeDeleteConfirm();
        expect(document.querySelector('.delete-confirm')).toBeNull();
    });
});

// ── showClearAllConfirm ───────────────────────────────────────────────────

describe('PopupView — showClearAllConfirm', () => {
    let view, anchor;
    beforeEach(() => {
        buildDOM();
        view = new PopupView(makeHandlers());
        anchor = document.createElement('div');
        anchor.className = 'dropdown-item';
        document.body.appendChild(anchor);
    });

    test('inserts a confirm panel after the anchor element', () => {
        view.showClearAllConfirm(anchor, vi.fn());
        expect(document.getElementById('clearAllConfirm')).not.toBeNull();
    });

    test('calling a second time toggles the panel off', () => {
        const onConfirm = vi.fn();
        view.showClearAllConfirm(anchor, onConfirm);
        view.showClearAllConfirm(anchor, onConfirm);
        expect(document.getElementById('clearAllConfirm')).toBeNull();
    });

    test('Cancel button removes the panel without calling onConfirm', () => {
        const onConfirm = vi.fn();
        view.showClearAllConfirm(anchor, onConfirm);
        const cancelBtn = [...document.querySelectorAll('#clearAllConfirm button')]
            .find((b) => b.textContent === 'Cancel');
        cancelBtn.click();
        expect(document.getElementById('clearAllConfirm')).toBeNull();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    test('Delete button calls onConfirm and removes the panel', () => {
        const onConfirm = vi.fn();
        view.showClearAllConfirm(anchor, onConfirm);
        const deleteBtn = [...document.querySelectorAll('#clearAllConfirm button')]
            .find((b) => b.textContent === 'Delete');
        deleteBtn.click();
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(document.getElementById('clearAllConfirm')).toBeNull();
    });
});

// ── showNotification ──────────────────────────────────────────────────────

describe('PopupView — showNotification', () => {
    let view;
    beforeEach(() => { buildDOM(); view = new PopupView(makeHandlers()); vi.useFakeTimers(); });
    afterEach(() => vi.useRealTimers());

    test('creates a success notification with correct text', () => {
        view.showNotification('Saved!');
        const el = document.querySelector('.notification.success');
        expect(el).not.toBeNull();
        expect(el.textContent).toBe('Saved!');
    });

    test('creates an error notification when isError is true', () => {
        view.showNotification('Oops', true);
        expect(document.querySelector('.notification.error')).not.toBeNull();
        expect(document.querySelector('.notification.success')).toBeNull();
    });

    test('notification is removed after 3000 ms', () => {
        view.showNotification('Bye');
        expect(document.querySelector('.notification')).not.toBeNull();
        vi.advanceTimersByTime(3000);
        expect(document.querySelector('.notification')).toBeNull();
    });

    test('notification is still present just before 3000 ms', () => {
        view.showNotification('Still here');
        vi.advanceTimersByTime(2999);
        expect(document.querySelector('.notification')).not.toBeNull();
    });
});

// ── renderInvitationChart ─────────────────────────────────────────────────

describe('PopupView — renderInvitationChart', () => {
    const WEEKS     = ['2026-04-06','2026-04-13','2026-04-20','2026-04-27',
                       '2026-05-04','2026-05-11','2026-05-18','2026-05-25'];
    const COUNTS    = [0, 5, 3, 8, 2, 10, 0, 7];
    const WITHDRAWN = [0, 1, 0, 2, 0,  0, 3, 0];

    let view;
    beforeEach(() => { buildDOM(); view = new PopupView(makeHandlers()); });

    test('creates an SVG element in #invitationStatsList', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        expect(document.querySelector('#invitationStatsList svg')).not.toBeNull();
    });

    test('renders two <rect> bars per week (sent + withdrawn)', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        expect(document.querySelectorAll('#invitationStatsList rect[data-bar]').length).toBe(WEEKS.length * 2);
    });

    test('last (current-week) sent bar uses the highlighted fill colour', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        const sentBars = [...document.querySelectorAll('#invitationStatsList rect[data-bar="sent"]')];
        expect(sentBars[sentBars.length - 1].getAttribute('fill')).toBe('#0a66c2');
    });

    test('past-week sent bars use the muted fill colour', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        const sentBars = [...document.querySelectorAll('#invitationStatsList rect[data-bar="sent"]')];
        expect(sentBars.slice(0, -1).every((r) => r.getAttribute('fill') === '#93bfe8')).toBe(true);
    });

    test('last (current-week) withdrawn bar uses the highlighted orange colour', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        const wBars = [...document.querySelectorAll('#invitationStatsList rect[data-bar="withdrawn"]')];
        expect(wBars[wBars.length - 1].getAttribute('fill')).toBe('#e85d04');
    });

    test('count labels are rendered for weeks with count > 0', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        const nonZeroCount = COUNTS.filter((c) => c > 0).length;
        const allTexts = document.querySelectorAll('#invitationStatsList text');
        const barLabels = [...allTexts].filter((t) => /^\d+$/.test(t.textContent.trim()) && Number(t.textContent) > 0);
        expect(barLabels.length).toBeGreaterThanOrEqual(nonZeroCount);
    });

    test('replaces previous chart on re-render', () => {
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        view.renderInvitationChart(WEEKS, COUNTS, WITHDRAWN);
        expect(document.querySelectorAll('#invitationStatsList svg').length).toBe(1);
    });

    test('handles all-zero counts without throwing', () => {
        const zeros = [0, 0, 0, 0, 0, 0, 0, 0];
        expect(() => view.renderInvitationChart(WEEKS, zeros, zeros)).not.toThrow();
    });
});

// ── onCategoryListClick event delegation ─────────────────────────────────

describe('PopupView — onCategoryListClick', () => {
    let view, handlers;
    beforeEach(() => {
        buildDOM();
        handlers = makeHandlers();
        view = new PopupView(handlers);
        view.renderCategoryList([CAT_A, CAT_B]);
    });

    test('edit button calls handlers.onEdit with the category id', () => {
        const editBtn = document.querySelector('[data-action="edit"][data-id="cat_1"]');
        view.onCategoryListClick({ target: editBtn });
        expect(handlers.onEdit).toHaveBeenCalledWith('cat_1');
    });

    test('delete button shows the inline confirm panel (does not call handler yet)', () => {
        const delBtn = document.querySelector('[data-action="delete"][data-id="cat_1"]');
        view.onCategoryListClick({ target: delBtn });
        expect(document.querySelector('.delete-confirm')).not.toBeNull();
        expect(handlers.onDeleteConfirm).not.toHaveBeenCalled();
    });

    test('confirm-delete button calls handlers.onDeleteConfirm', () => {
        const delBtn = document.querySelector('[data-action="delete"][data-id="cat_1"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        const confirmBtn = document.querySelector('[data-action="confirm-delete"]');
        view.onCategoryListClick({ target: confirmBtn });
        expect(handlers.onDeleteConfirm).toHaveBeenCalledWith('cat_1');
    });

    test('cancel-delete button closes the confirm panel', () => {
        const delBtn = document.querySelector('[data-action="delete"][data-id="cat_1"]');
        view.showDeleteConfirm(delBtn, 'cat_1');
        const cancelBtn = document.querySelector('[data-action="cancel-delete"]');
        view.onCategoryListClick({ target: cancelBtn });
        expect(document.querySelector('.delete-confirm')).toBeNull();
    });

    test('color button opens the swatch picker panel', () => {
        view.renderCategoryList([CAT_A]);
        const swatchBtn = document.querySelector('[data-action="color"][data-id="cat_1"]');
        view.onCategoryListClick({ target: swatchBtn });
        expect(document.querySelector('.swatch-picker')).not.toBeNull();
    });

    test('clicking a non-action element is a no-op', () => {
        const name = document.querySelector('.category-name');
        expect(() => view.onCategoryListClick({ target: name })).not.toThrow();
        expect(handlers.onEdit).not.toHaveBeenCalled();
    });
});

// ── openSwatchPicker / closeSwatchPicker ──────────────────────────────────

describe('PopupView — openSwatchPicker / closeSwatchPicker', () => {
    let view, handlers;
    beforeEach(() => {
        buildDOM();
        handlers = makeHandlers();
        view = new PopupView(handlers);
        view.renderCategoryList([CAT_A]);
    });

    test('opens a swatch-picker panel after the category row', () => {
        const swatchBtn = document.querySelector('[data-action="color"]');
        view.openSwatchPicker(swatchBtn, 'cat_1');
        expect(document.querySelector('.swatch-picker')).not.toBeNull();
    });

    test('swatch-picker contains one chip per palette entry', () => {
        const swatchBtn = document.querySelector('[data-action="color"]');
        view.openSwatchPicker(swatchBtn, 'cat_1');
        // BADGE_PALETTE has 16 entries
        expect(document.querySelectorAll('.swatch-picker .color-chip').length).toBe(16);
    });

    test('selected chip matches the category current colorIndex', () => {
        const swatchBtn = document.querySelector('[data-action="color"]');
        view.openSwatchPicker(swatchBtn, 'cat_1'); // CAT_A.colorIndex = 0
        const selected = document.querySelectorAll('.swatch-picker .color-chip-selected');
        expect(selected.length).toBe(1);
        // The first chip (index 0) should be selected
        expect(document.querySelectorAll('.swatch-picker .color-chip')[0]
            .classList.contains('color-chip-selected')).toBe(true);
    });

    test('clicking a chip calls handlers.onColorSelect and closes the picker', () => {
        const swatchBtn = document.querySelector('[data-action="color"]');
        view.openSwatchPicker(swatchBtn, 'cat_1');
        const chips = document.querySelectorAll('.swatch-picker .color-chip');
        chips[2].click();
        expect(handlers.onColorSelect).toHaveBeenCalledWith('cat_1', 2);
        expect(document.querySelector('.swatch-picker')).toBeNull();
    });

    test('calling openSwatchPicker for same id toggles the picker off', () => {
        const swatchBtn = document.querySelector('[data-action="color"]');
        view.openSwatchPicker(swatchBtn, 'cat_1');
        view.openSwatchPicker(swatchBtn, 'cat_1');
        expect(document.querySelector('.swatch-picker')).toBeNull();
    });

    test('closeSwatchPicker removes the panel', () => {
        const swatchBtn = document.querySelector('[data-action="color"]');
        view.openSwatchPicker(swatchBtn, 'cat_1');
        view.closeSwatchPicker();
        expect(document.querySelector('.swatch-picker')).toBeNull();
    });
});

// ── Search Strings fixture helpers ────────────────────────────────────────

/** Minimum HTML required by search string methods. */
function buildSearchStringsDOM() {
    document.body.innerHTML = `
        <button id="categoriesToggle" aria-expanded="false"></button>
        <div id="categoriesCollapsible" class="hidden">
            <div id="categoriesList"></div>
            <div id="categoryForm" class="category-form hidden">
                <input type="text" id="categoryName" />
                <textarea id="categoryKeywords"></textarea>
            </div>
        </div>
        <button id="searchStringsToggle" aria-expanded="false"></button>
        <div id="searchStringsCollapsible" class="hidden">
            <div id="searchStringsList"></div>
            <div id="searchStringForm" class="hidden">
                <input type="text" id="searchStringLabel" />
                <textarea id="searchStringValue"></textarea>
            </div>
        </div>
        <div id="invitationStatsList"></div>
        <div id="actionsDropdown" class="hidden"></div>
    `;
}

function makeSearchHandlers() {
    return {
        onReorder:                    vi.fn(),
        onColorSelect:                vi.fn(),
        onEdit:                       vi.fn(),
        onDeleteConfirm:              vi.fn(),
        onDeleteSearchStringConfirm:  vi.fn(),
        onEditSearchString:           vi.fn(),
    };
}

const STR_A = { id: 'str_1', label: 'HR Talent', value: 'ht,talent,hhrr' };
const STR_B = { id: 'str_2', label: '',           value: 'eng,dev,cto'    };

// ── renderSearchStringList ────────────────────────────────────────────────

describe('PopupView — renderSearchStringList', () => {
    let view;
    beforeEach(() => { buildSearchStringsDOM(); view = new PopupView(makeSearchHandlers()); });

    test('renders one row per string', () => {
        view.renderSearchStringList([STR_A, STR_B]);
        expect(document.querySelectorAll('.search-string-row').length).toBe(2);
    });

    test('shows label text in .search-string-label when label is set', () => {
        view.renderSearchStringList([STR_A]);
        expect(document.querySelector('.search-string-label').textContent).toBe('HR Talent');
    });

    test('shows value in .search-string-label when label is empty', () => {
        view.renderSearchStringList([STR_B]);
        expect(document.querySelector('.search-string-label').textContent).toBe('eng,dev,cto');
    });

    test('shows value in .search-string-value', () => {
        view.renderSearchStringList([STR_A]);
        expect(document.querySelector('.search-string-value').textContent).toBe('ht,talent,hhrr');
    });

    test('each row has edit and delete action buttons', () => {
        view.renderSearchStringList([STR_A]);
        expect(document.querySelector('[data-action="edit"][data-id="str_1"]')).not.toBeNull();
        expect(document.querySelector('[data-action="delete"][data-id="str_1"]')).not.toBeNull();
    });

    test('shows placeholder when list is empty', () => {
        view.renderSearchStringList([]);
        expect(document.querySelectorAll('.search-string-row').length).toBe(0);
        expect(document.querySelector('#searchStringsList p')).not.toBeNull();
    });

    test('re-render replaces previous content', () => {
        view.renderSearchStringList([STR_A, STR_B]);
        view.renderSearchStringList([STR_A]);
        expect(document.querySelectorAll('.search-string-row').length).toBe(1);
    });
});

// ── openSearchStringForm / closeSearchStringForm ──────────────────────────

describe('PopupView — openSearchStringForm / closeSearchStringForm', () => {
    let view;
    beforeEach(() => { buildSearchStringsDOM(); view = new PopupView(makeSearchHandlers()); });

    test('openSearchStringForm() shows empty form for a new string', () => {
        view.openSearchStringForm();
        expect(document.getElementById('searchStringForm').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('searchStringLabel').value).toBe('');
        expect(document.getElementById('searchStringValue').value).toBe('');
        expect(view.editingSearchStringId).toBeNull();
    });

    test('openSearchStringForm(entry) populates label and value', () => {
        view.openSearchStringForm(STR_A);
        expect(document.getElementById('searchStringLabel').value).toBe('HR Talent');
        expect(document.getElementById('searchStringValue').value).toBe('ht,talent,hhrr');
        expect(view.editingSearchStringId).toBe('str_1');
    });

    test('openSearchStringForm expands the collapsible if hidden', () => {
        view.openSearchStringForm();
        expect(document.getElementById('searchStringsCollapsible').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('searchStringsToggle').getAttribute('aria-expanded')).toBe('true');
    });

    test('openSearchStringForm for entry with empty label leaves label blank', () => {
        view.openSearchStringForm(STR_B);
        expect(document.getElementById('searchStringLabel').value).toBe('');
        expect(document.getElementById('searchStringValue').value).toBe('eng,dev,cto');
    });

    test('closeSearchStringForm hides the form and clears inputs', () => {
        view.openSearchStringForm(STR_A);
        view.closeSearchStringForm();
        expect(document.getElementById('searchStringForm').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('searchStringLabel').value).toBe('');
        expect(document.getElementById('searchStringValue').value).toBe('');
        expect(view.editingSearchStringId).toBeNull();
    });
});

// ── getSearchStringFormValues ─────────────────────────────────────────────

describe('PopupView — getSearchStringFormValues', () => {
    let view;
    beforeEach(() => { buildSearchStringsDOM(); view = new PopupView(makeSearchHandlers()); });

    test('returns trimmed label and value', () => {
        document.getElementById('searchStringLabel').value = '  HR Talent  ';
        document.getElementById('searchStringValue').value = '  ht,talent,hhrr  ';
        const { label, value } = view.getSearchStringFormValues();
        expect(label).toBe('HR Talent');
        expect(value).toBe('ht,talent,hhrr');
    });

    test('returns empty label when blank', () => {
        document.getElementById('searchStringLabel').value = '';
        document.getElementById('searchStringValue').value = 'x';
        expect(view.getSearchStringFormValues().label).toBe('');
    });
});

// ── onSearchStringListClick ───────────────────────────────────────────────

describe('PopupView — onSearchStringListClick', () => {
    let view, handlers;
    beforeEach(() => {
        buildSearchStringsDOM();
        handlers = makeSearchHandlers();
        view = new PopupView(handlers);
        view.renderSearchStringList([STR_A]);
    });

    test('edit button calls handlers.onEditSearchString', () => {
        const editBtn = document.querySelector('[data-action="edit"][data-id="str_1"]');
        view.onSearchStringListClick({ target: editBtn });
        expect(handlers.onEditSearchString).toHaveBeenCalledWith('str_1');
    });

    test('delete button shows inline confirm panel (does not call handler yet)', () => {
        const delBtn = document.querySelector('[data-action="delete"][data-id="str_1"]');
        view.onSearchStringListClick({ target: delBtn });
        expect(document.querySelector('.delete-confirm')).not.toBeNull();
        expect(handlers.onDeleteSearchStringConfirm).not.toHaveBeenCalled();
    });

    test('confirm Delete button in panel calls onDeleteSearchStringConfirm', () => {
        const delBtn = document.querySelector('[data-action="delete"][data-id="str_1"]');
        view.onSearchStringListClick({ target: delBtn });
        const yesBtn = [...document.querySelectorAll('.delete-confirm button')]
            .find((b) => b.textContent === 'Delete');
        yesBtn.click();
        expect(handlers.onDeleteSearchStringConfirm).toHaveBeenCalledWith('str_1');
    });

    test('Cancel button in panel removes the confirm panel', () => {
        const delBtn = document.querySelector('[data-action="delete"][data-id="str_1"]');
        view.onSearchStringListClick({ target: delBtn });
        const noBtn = [...document.querySelectorAll('.delete-confirm button')]
            .find((b) => b.textContent === 'Cancel');
        noBtn.click();
        expect(document.querySelector('.delete-confirm')).toBeNull();
    });

    test('clicking a non-action element is a no-op', () => {
        const label = document.querySelector('.search-string-label');
        expect(() => view.onSearchStringListClick({ target: label })).not.toThrow();
        expect(handlers.onEditSearchString).not.toHaveBeenCalled();
    });
});
