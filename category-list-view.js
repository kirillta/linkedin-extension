/**
 * CategoryListView — renders the category list, wires drag-and-drop reorder,
 * and manages the inline delete-confirmation panel.
 *
 * Requires BADGE_PALETTE (palette.js) to be loaded before this script.
 */

/* global BADGE_PALETTE */

class CategoryListView {
    /**
     * @param {{
     *   onReorder:       (fromId: string, toId: string, insertBefore: boolean) => void,
     *   onColorClick:    (btn: HTMLElement, catId: string) => void,
     *   onEdit:          (catId: string) => void,
     *   onDeleteConfirm: (catId: string) => void,
     * }} handlers
     */
    constructor(handlers) {
        this._handlers = handlers;

        /** @type {Array} Latest rendered categories. */
        this.currentCategories = [];
        /** @type {string|null} */
        this._draggedId = null;
        /** @type {HTMLElement|null} */
        this._deleteConfirmPanel = null;
    }

    renderCategoryList(categories) {
        this.currentCategories = categories;
        const list = document.getElementById('categoriesList');
        list.innerHTML = '';
        this._wireDragAndDrop(list);

        if (categories.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'font-size:12px;color:#999;font-style:italic;padding:6px 0 2px;';
            empty.textContent = 'No categories yet. Click + Add to create one.';
            list.appendChild(empty);

            return;
        }

        for (const cat of categories) 
            list.appendChild(this._buildCategoryRow(cat));
    }

    _wireDragAndDrop(list) {
        list.ondragstart = (e) => {
            const row = e.target.closest('.category-row[draggable]');
            if (!row) 
                return;

            this._draggedId = row.dataset.id;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => row.classList.add('dragging'), 0);
        };

        list.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const row = e.target.closest('.category-row');
            if (!row || row.dataset.id === this._draggedId) 
                return;

            this._clearDragIndicators();
            const rect = row.getBoundingClientRect();
            row.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drag-over-top' : 'drag-over-bottom');
        };

        list.ondragleave = (e) => {
            if (!list.contains(e.relatedTarget)) 
                this._clearDragIndicators();
        };

        list.ondrop = (e) => {
            e.preventDefault();
            const row = e.target.closest('.category-row');
            const toId = row?.dataset.id;
            const insertBefore = row?.classList.contains('drag-over-top');
            this._clearDragIndicators();
            if (toId && this._draggedId && toId !== this._draggedId)
                this._handlers.onReorder(this._draggedId, toId, insertBefore);
        };

        list.ondragend = () => {
            this._clearDragIndicators();
            list.querySelectorAll('.category-row.dragging').forEach((r) => r.classList.remove('dragging'));
            this._draggedId = null;
        };
    }

    /** @returns {HTMLElement} */
    _buildCategoryRow(cat) {
        const palette = BADGE_PALETTE[cat.colorIndex % BADGE_PALETTE.length];
        const row = document.createElement('div');
        row.className = 'category-row';
        row.dataset.id = cat.id;
        row.draggable = true;

        row.appendChild(this._buildDragHandle());
        row.appendChild(this._buildSwatchBtn(cat, palette));
        row.appendChild(this._buildNameSpan(cat));
        row.appendChild(this._buildKwCountSpan(cat));
        row.appendChild(this._buildEditBtn(cat.id));
        row.appendChild(this._buildDeleteBtn(cat.id));

        return row;
    }

    /** @returns {HTMLElement} */
    _buildDragHandle() {
        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.setAttribute('aria-hidden', 'true');
        handle.innerHTML ='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true"><circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/></svg>';
        
        return handle;
    }

    /** @returns {HTMLElement} */
    _buildSwatchBtn(cat, palette) {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'category-swatch';
        swatch.style.background = `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bg2} 100%)`;
        swatch.style.borderColor = palette.border;
        swatch.dataset.action = 'color';
        swatch.dataset.id = cat.id;
        swatch.title = 'Change color';

        return swatch;
    }

    /** @returns {HTMLElement} */
    _buildNameSpan(cat) {
        const name = document.createElement('span');
        name.className = 'category-name';
        name.textContent = cat.name;

        return name;
    }

    /** @returns {HTMLElement} */
    _buildKwCountSpan(cat) {
        const count = document.createElement('span');
        count.className = 'kw-count';
        const kwLen = (cat.keywords || []).length;
        count.textContent = `${kwLen} kw`;
        count.title = (cat.keywords || []).join('\n');

        return count;
    }

    /** @returns {HTMLElement} */
    _buildEditBtn(catId) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        btn.title = 'Edit category';
        btn.dataset.action = 'edit';
        btn.dataset.id = catId;

        return btn;
    }

    /** @returns {HTMLElement} */
    _buildDeleteBtn(catId) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon btn-icon-delete';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        btn.title = 'Delete category';
        btn.dataset.action = 'delete';
        btn.dataset.id = catId;

        return btn;
    }

    showDeleteConfirm(delBtn, catId) {
        if (this._deleteConfirmPanel && this._deleteConfirmPanel.dataset.catId === catId) {
            this.closeDeleteConfirm();
            return;
        }

        this.closeDeleteConfirm();
        const panel = this._buildDeleteConfirmPanel(catId);
        delBtn.closest('.category-row').after(panel);
        this._deleteConfirmPanel = panel;
    }

    /** @returns {HTMLElement} */
    _buildDeleteConfirmPanel(catId) {
        const panel = document.createElement('div');
        panel.className = 'delete-confirm';
        panel.dataset.catId = catId;

        const msg = document.createElement('span');
        msg.className = 'delete-confirm-text';
        msg.textContent = 'Delete this category?';

        const yesBtn = document.createElement('button');
        yesBtn.type = 'button';
        yesBtn.className = 'btn btn-sm btn-danger-sm';
        yesBtn.textContent = 'Delete';
        yesBtn.dataset.action = 'confirm-delete';
        yesBtn.dataset.id = catId;

        const noBtn = document.createElement('button');
        noBtn.type = 'button';
        noBtn.className = 'btn btn-sm btn-secondary btn-sm';
        noBtn.textContent = 'Cancel';
        noBtn.dataset.action = 'cancel-delete';

        panel.appendChild(msg);
        panel.appendChild(yesBtn);
        panel.appendChild(noBtn);
        
        return panel;
    }

    closeDeleteConfirm() {
        if (this._deleteConfirmPanel) {
            this._deleteConfirmPanel.remove();
            this._deleteConfirmPanel = null;
        }
    }

    onCategoryListClick(event) {
        const btn = event.target.closest('[data-action]');
        if (!btn) 
            return;

        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === 'color') {
            this._handlers.onColorClick(btn, id);
            return;
        }

        if (action === 'delete') {
            this.showDeleteConfirm(btn, id);
            return;
        }

        if (action === 'confirm-delete') {
            this._handlers.onDeleteConfirm(id);
            return;
        }

        if (action === 'cancel-delete') {
            this.closeDeleteConfirm();
            return;
        }

        if (action === 'edit') {
            this._handlers.onEdit(id);
        }
    }

    _clearDragIndicators() {
        document.querySelectorAll('.category-row.drag-over-top, .category-row.drag-over-bottom')
            .forEach((el) => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    }
}
