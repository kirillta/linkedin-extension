/**
 * ConnectPromoter — ensures Connect is the first action on LinkedIn /in/ pages.
 *
 * Case A (Connect is a direct visible button, just not first):
 *   Handled entirely by CSS `order: -1` on the button — no JS needed.
 *   This approach is immune to Ember re-renders.
 *
 * Case B (Connect is buried inside the More dropdown):
 *   A synthetic "Connect" button is injected as the first action.
 *   On click it opens More and delegates to the hidden item so LinkedIn's
 *   own handler fires (modal or direct send).
 */
class ConnectPromoter {
    run() {
        if (!window.location.href.match(/linkedin\.com\/in\//)) 
            return;

        const actionsEl = this._findActionsContainer();
        if (!actionsEl) 
            return;

        // Case A: Connect is a direct <button> inside the actions container (not in
        // the dropdown). CSS order:-1 already handles visual placement — just bail
        // so we don't add a duplicate.
        if (actionsEl.querySelector('button[aria-label*="connect" i][aria-label*="invite" i]')) 
            return;

        // Case B: Connect lives only inside the More dropdown — inject a synthetic button.
        if (actionsEl.querySelector('[data-lkd-connect-promoted]')) 
            return;

        const { moreBtn, connectItem } = this._findConnectInMore();
        if (!connectItem) 
            return;

        const promoted = this._buildSyntheticButton();
        promoted.addEventListener('click', (e) => {
            e.stopPropagation();
            this._triggerViaMore(moreBtn, connectItem, promoted);
        });
        actionsEl.insertBefore(promoted, actionsEl.firstElementChild);
    }

    _findActionsContainer() {
        const main = document.querySelector('main') || document.body;
        const moreBtn = main.querySelector('button[aria-label="More actions"]');
        if (!moreBtn) 
            return null;
        
        let el = moreBtn.parentElement;
        while (el && el !== main) {
            if (el.querySelector('button[aria-label*="Message" i]')) 
                return el;
            
            el = el.parentElement;
        }

        return null;
    }

    _findConnectInMore() {
        const main = document.querySelector('main') || document.body;
        const moreBtn = main.querySelector('button[aria-label="More actions"]');
        if (!moreBtn) 
            return { moreBtn: null, connectItem: null };

        const dropdown = moreBtn.closest('.artdeco-dropdown');
        if (!dropdown) 
            return { moreBtn, connectItem: null };

        const connectItem = dropdown.querySelector(
            '[role="button"][aria-label*="connect" i][aria-label*="invite" i]'
        );

        return { moreBtn, connectItem };
    }

    _buildSyntheticButton() {
        const btn = document.createElement('button');
        btn.setAttribute('data-lkd-connect-promoted', 'true');
        btn.className = 'lkd-connect-btn artdeco-button artdeco-button--2 artdeco-button--secondary';
        btn.type = 'button';
        btn.textContent = 'Connect';
        
        return btn;
    }

    _triggerViaMore(moreBtn, connectItem, promotedBtn) {
        if (moreBtn) {
            moreBtn.click();
            setTimeout(() => {
                connectItem.click();
                this._watchForPending(promotedBtn);
            }, 80);
        } else {
            connectItem.click();
            this._watchForPending(promotedBtn);
        }
    }

    _watchForPending(promotedBtn) {
        const deadline = Date.now() + 8000;
        const interval = setInterval(() => {
            if (Date.now() > deadline) { 
                clearInterval(interval); 
                return; 
            }
            
            const actionsEl = this._findActionsContainer();
            if (!actionsEl) 
                return;
            
            const hasPendingBtn = actionsEl.querySelector('button[aria-label*="pending" i]');
            const hasWithdrawItem = document.querySelector('.artdeco-dropdown__content [role="button"][aria-label*="withdraw" i]');
            const connectGone = !document.querySelector('.artdeco-dropdown__content [role="button"][aria-label*="connect" i][aria-label*="invite" i]');
            if (hasPendingBtn || hasWithdrawItem || connectGone) {
                clearInterval(interval);

                promotedBtn.textContent = 'Pending';
                promotedBtn.disabled = true;
                promotedBtn.classList.add('lkd-connect-btn--pending');
            }
        }, 300);
    }
}
