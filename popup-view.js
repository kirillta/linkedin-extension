/**
 * PopupView — coordinates the popup UI.
 *
 * Delegates category-list rendering and delete confirmation to CategoryListView,
 * and chart rendering to renderInvitationChart. Owns the category form, swatch
 * color picker, clear-all confirmation, and notification toast.
 *
 * Requires (in load order): palette.js, category-list-view.js,
 * invitation-chart-view.js
 */

/* global BADGE_PALETTE, CategoryListView, renderInvitationChart */

const _SS_ICONS = {
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
};

class PopupView {
    /**
     * @param {{
     *   onReorder: (fromId: string, toId: string, insertBefore: boolean) => void,
     *   onColorSelect: (catId: string, colorIndex: number) => void,
     *   onEdit: (catId: string) => void,
     *   onDeleteConfirm: (catId: string) => void,
     *   onDeleteSearchStringConfirm: (strId: string) => void,
     *   onEditSearchString: (strId: string) => void,
     * }} handlers
     */
    constructor(handlers) {
        this._handlers = handlers;

        this._listView = new CategoryListView({
            onReorder: handlers.onReorder,
            onColorClick: (btn, id) => this.openSwatchPicker(btn, id),
            onEdit: handlers.onEdit,
            onDeleteConfirm: handlers.onDeleteConfirm,
        });

        /** @type {string|null} Id of category being edited (null = new). */
        this.editingCategoryId = null;
        /** @type {number} Color index selected in the form color picker. */
        this.editingColorIndex = 0;

        /** @type {string|null} Id of search string being edited (null = new). */
        this.editingSearchStringId = null;
        /** @type {HTMLElement|null} */
        this._searchStringDeletePanel = null;

        /** @type {HTMLElement|null} */
        this._clearAllPanel = null;
        /** @type {HTMLElement|null} */
        this._swatchPicker = null;
        /** @type {Function|null} */
        this._swatchOutsideHandler = null;
    }

    get currentCategories() { 
        return this._listView.currentCategories; 
    }

    renderCategoryList(categories) { 
        this._listView.renderCategoryList(categories); 
    }

    showDeleteConfirm(delBtn, catId) { 
        this._listView.showDeleteConfirm(delBtn, catId); 
    }

    closeDeleteConfirm() { 
        this._listView.closeDeleteConfirm(); 
    }

    onCategoryListClick(event) { 
        this._listView.onCategoryListClick(event); 
    }

    /**
     * @param {string[]} weeks Ordered Monday week-key strings (oldest → newest).
     * @param {number[]} invitationCounts Sent invitation counts matching each week.
     * @param {number[]} withdrawnCounts Withdrawn counts matching each week.
     */
    renderInvitationChart(weeks, invitationCounts, withdrawnCounts) {
        renderInvitationChart(document.getElementById('invitationStatsList'), weeks, invitationCounts, withdrawnCounts);
    }

    renderColorPicker(selectedIndex) {
        const picker = document.getElementById('colorPicker');
        picker.innerHTML = '';
        this.editingColorIndex = selectedIndex;

        BADGE_PALETTE.forEach((p, idx) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'color-chip' + (idx === selectedIndex ? ' color-chip-selected' : '');
            chip.style.background = `linear-gradient(135deg, ${p.border} 0%, ${p.bg} 100%)`;
            chip.style.borderColor = p.border;
            chip.title = `Color ${idx + 1}`;
            chip.addEventListener('click', () => {
                this.editingColorIndex = idx;
                picker.querySelectorAll('.color-chip').forEach((c) => c.classList.remove('color-chip-selected'));
                chip.classList.add('color-chip-selected');
            });

            picker.appendChild(chip);
        });
    }

    openCategoryForm(category = null) {
        const collapsible = document.getElementById('categoriesCollapsible');
        const toggle = document.getElementById('categoriesToggle');
        if (collapsible.classList.contains('hidden')) {
            collapsible.classList.remove('hidden');
            toggle.setAttribute('aria-expanded', 'true');
        }

        this.editingCategoryId = category ? category.id : null;
        document.getElementById('categoryName').value = category ? category.name : '';
        document.getElementById('categoryKeywords').value = category
            ? (category.keywords || []).join('\n')
            : '';
        document.getElementById('categoryForm').classList.remove('hidden');
        document.getElementById('categoryName').focus();
    }

    closeCategoryForm() {
        this.editingCategoryId = null;
        this.closeSwatchPicker();
        document.getElementById('categoryForm').classList.add('hidden');
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryKeywords').value = '';
    }

    /** @returns {{ name: string, keywords: string[] }} */
    getFormValues() {
        return {
            name: document.getElementById('categoryName').value.trim(),
            keywords: document.getElementById('categoryKeywords').value
                .split('\n')
                .map((k) => k.trim())
                .filter(Boolean),
        };
    }

    /**
     * Toggles an inline "Delete all tracked companies?" panel below anchorEl.
     * @param {HTMLElement} anchorEl
     * @param {() => void} onConfirm
     */
    showClearAllConfirm(anchorEl, onConfirm) {
        if (this._clearAllPanel) {
            this._clearAllPanel.remove();
            this._clearAllPanel = null;

            return;
        }

        const panel = document.createElement('div');
        panel.id = 'clearAllConfirm';
        panel.className = 'delete-confirm';
        panel.style.margin = '6px 0 2px';

        const msg = document.createElement('span');
        msg.className = 'delete-confirm-text';
        msg.textContent = 'Delete all tracked companies?';

        const yesBtn = document.createElement('button');
        yesBtn.type = 'button';
        yesBtn.className = 'btn btn-sm btn-danger-sm';
        yesBtn.textContent = 'Delete';
        yesBtn.addEventListener('click', () => {
            panel.remove();
            this._clearAllPanel = null;
            onConfirm();
        });

        const noBtn = document.createElement('button');
        noBtn.type = 'button';
        noBtn.className = 'btn btn-sm btn-secondary btn-sm';
        noBtn.textContent = 'Cancel';
        noBtn.addEventListener('click', () => {
            panel.remove();
            this._clearAllPanel = null;
        });

        panel.appendChild(msg);
        panel.appendChild(yesBtn);
        panel.appendChild(noBtn);
        anchorEl.after(panel);
        this._clearAllPanel = panel;
        document.getElementById('actionsDropdown').classList.remove('hidden');
    }

    openSwatchPicker(swatchBtn, catId) {
        this.closeDeleteConfirm();
        if (this._swatchPicker && this._swatchPicker.dataset.catId === catId) {
            this.closeSwatchPicker();
            return;
        }

        this.closeSwatchPicker();

        const cat = this.currentCategories.find((c) => c.id === catId);
        const selectedIndex = cat ? (cat.colorIndex ?? 0) : 0;

        const panel = document.createElement('div');
        panel.className = 'swatch-picker';
        panel.dataset.catId = catId;

        const grid = document.createElement('div');
        grid.className = 'color-picker';

        BADGE_PALETTE.forEach((p, idx) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'color-chip' + (idx === selectedIndex ? ' color-chip-selected' : '');
            chip.style.background = `linear-gradient(135deg, ${p.border} 0%, ${p.bg} 100%)`;
            chip.style.borderColor = p.border;
            chip.title = `Color ${idx + 1}`;
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handlers.onColorSelect(catId, idx);
                this.closeSwatchPicker();
            });

            grid.appendChild(chip);
        });

        panel.appendChild(grid);
        swatchBtn.closest('.category-row').after(panel);
        this._swatchPicker = panel;

        this._swatchOutsideHandler = (e) => {
            if (!panel.contains(e.target) && e.target !== swatchBtn) this.closeSwatchPicker();
        };

        setTimeout(() => document.addEventListener('click', this._swatchOutsideHandler), 0);
    }

    closeSwatchPicker() {
        if (this._swatchPicker) {
            this._swatchPicker.remove();
            this._swatchPicker = null;
        }
        
        if (this._swatchOutsideHandler) {
            document.removeEventListener('click', this._swatchOutsideHandler);
            this._swatchOutsideHandler = null;
        }
    }

    showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    // ── Search Strings ──────────────────────────────────────────────────────

    /**
     * @param {Array<{id: string, label: string, value: string}>} strings
     */
    renderSearchStringList(strings) {
        const list = document.getElementById('searchStringsList');
        list.innerHTML = '';

        if (!strings.length) {
            const p = document.createElement('p');
            p.className = 'categories-priority-hint';
            p.textContent = 'No search strings yet. Click "+ Add" to create one.';
            list.appendChild(p);

            return;
        }

        for (const str of strings) {
            const label = document.createElement('span');
            label.className = 'search-string-label';
            label.textContent = str.label || str.value;
            label.title = str.value;

            const value = document.createElement('span');
            value.className = 'search-string-value';
            value.textContent = str.value;

            const row = document.createElement('div');
            row.className = 'search-string-row';
            row.dataset.id = str.id;
            row.append(label, value,
                this._ssBtn('edit',   str.id, 'Edit'),
                this._ssBtn('delete', str.id, 'Delete', 'btn-icon-delete'),
            );

            list.appendChild(row);
        }
    }

    _ssBtn(action, id, title, extraClass = '') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-icon' + (extraClass ? ' ' + extraClass : '');
        btn.dataset.action = action;
        btn.dataset.id = id;
        btn.title = title;
        btn.innerHTML = _SS_ICONS[action];
        
        return btn;
    }

    onSearchStringListClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) 
            return;

        const { action, id } = btn.dataset;
        if (action === 'edit') {
            this.closeSearchStringDeleteConfirm();
            this._handlers.onEditSearchString(id);
        } else if (action === 'delete') {
            this._toggleSearchStringDeleteConfirm(btn, id);
        }
    }

    _toggleSearchStringDeleteConfirm(delBtn, strId) {
        const prev = this._searchStringDeletePanel;
        this.closeSearchStringDeleteConfirm();
        if (prev?.dataset.strId === strId) 
            return;

        const panel = document.createElement('div');
        panel.className = 'delete-confirm';
        panel.dataset.strId = strId;

        const msg = document.createElement('span');
        msg.className = 'delete-confirm-text';
        msg.textContent = 'Delete this search string?';

        const yesBtn = document.createElement('button');
        yesBtn.type = 'button';
        yesBtn.className = 'btn btn-sm btn-danger-sm';
        yesBtn.textContent = 'Delete';
        yesBtn.addEventListener('click', () => this._handlers.onDeleteSearchStringConfirm(strId));

        const noBtn = document.createElement('button');
        noBtn.type = 'button';
        noBtn.className = 'btn btn-sm btn-secondary btn-sm';
        noBtn.textContent = 'Cancel';
        noBtn.addEventListener('click', () => this.closeSearchStringDeleteConfirm());

        panel.append(msg, yesBtn, noBtn);
        delBtn.closest('.search-string-row').after(panel);
        this._searchStringDeletePanel = panel;
    }

    closeSearchStringDeleteConfirm() {
        this._searchStringDeletePanel?.remove();
        this._searchStringDeletePanel = null;
    }

    openSearchStringForm(entry = null) {
        const collapsible = document.getElementById('searchStringsCollapsible');
        const toggle = document.getElementById('searchStringsToggle');
        if (collapsible.classList.contains('hidden')) {
            collapsible.classList.remove('hidden');
            toggle.setAttribute('aria-expanded', 'true');
        }

        this.editingSearchStringId = entry ? entry.id : null;
        document.getElementById('searchStringLabel').value = entry ? (entry.label || '') : '';
        document.getElementById('searchStringValue').value = entry ? entry.value : '';
        document.getElementById('searchStringForm').classList.remove('hidden');
        document.getElementById('searchStringLabel').focus();
    }

    closeSearchStringForm() {
        this.editingSearchStringId = null;
        document.getElementById('searchStringForm').classList.add('hidden');
        document.getElementById('searchStringLabel').value = '';
        document.getElementById('searchStringValue').value = '';
    }

    /** @returns {{ label: string, value: string }} */
    getSearchStringFormValues() {
        return {
            label: document.getElementById('searchStringLabel').value.trim(),
            value: document.getElementById('searchStringValue').value.trim(),
        };
    }
}
