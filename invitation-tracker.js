/**
 * InvitationTracker — records sent connection invitations per ISO-week
 * (Monday 00:00 UTC) in chrome.storage.local.
 *
 * Two detection paths (deduped via _lastSendAt timestamp):
 *   1. Click listener: "Send without a note" / "Send now" / "Send" inside a
 *      dialog → immediate count (modal flow).
 *   2. Click listener: "Connect" button → verify the same button becomes
 *      "Pending" after 1.5 s → count (direct-send flow, no modal).
 *   3. MutationObserver: "Invitation sent" toast text → count only if path 1/2
 *      hasn't already fired within the last 5 s.
 *
 * Storage schema:
 *   invitationStats: { "YYYY-MM-DD": count, ... }
 *   where the key is the Monday date (UTC) of the week the invitation was sent.
 */

// Flipped to false on the first caught Extension-context-invalidated error so
// that no further chrome API calls are made for the rest of the page session.
let _isInvitationContextActive = true;

class InvitationTracker {
    constructor() {
        /** Timestamp of the last counted send — used to deduplicate signals. */
        this._lastSendAt = 0;
    }

    /**
     * Return the ISO date string (YYYY-MM-DD) for Monday 00:00 UTC of the week
     * that contains `date`.
     * @param {Date} date
     * @returns {string}
     */
    getWeekKey(date) {
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        
        const day = utcDate.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        utcDate.setUTCDate(utcDate.getUTCDate() + diff);

        return utcDate.toISOString().slice(0, 10);
    }

    /**
     * Attach MutationObserver (toast fallback) and document click listener.
     */
    init() {
        // Path 3: toast fallback
        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) 
                        this._checkForInvitationToast(node);
                }
            }
        });
        this._observer.observe(document.body, { childList: true, subtree: true });

        // Paths 1 & 2: button click detection (capture phase catches clicks before
        // LinkedIn's own handlers can swap the button out)
        document.addEventListener('click', this._onDocumentClick.bind(this), true);
    }

    /**
     * Detect invitation-send button clicks.
     * @param {MouseEvent} event
     */
    _onDocumentClick(event) {
        const btn = event.target.closest('button, [role="button"]');
        if (!btn) 
            return;

        const text = (btn.textContent || '').trim();
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();

        // Path 1 — modal send buttons (most reliable; these are invitation-specific)
        if (text === 'Send without a note' ||text === 'Send now' ||(text === 'Send' && btn.closest('[role="dialog"]'))) {
            this._recordSend();
            return;
        }

        // Path 2 — direct Connect button (no modal): verify the button becomes
        // "Pending" within 1.5 s, which confirms the invite was actually sent.
        if (text === 'Connect' || (label.includes('invite') && label.includes('connect'))) {
            const clickedAt = Date.now();
            setTimeout(() => {
                if (this._lastSendAt >= clickedAt) 
                    return;

                const newText = (btn.textContent || '').trim();
                const newLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                if (newText === 'Pending' || newLabel.includes('pending'))
                    this._recordSend();
            }, 1500);
        }
    }

    /**
     * Toast fallback — only fires if click detection hasn't already counted
     * this send within the last 5 seconds.
     * @param {Element} node
     */
    _checkForInvitationToast(node) {
        if (node.getAttribute && node.getAttribute('data-lkd-invite-counted')) 
            return;
        
        if (Date.now() - this._lastSendAt < 5000) 
            return;

        const text = node.textContent || '';
        if (text.includes('Invitation sent') || text.includes('invitation was sent')) {
            node.setAttribute && node.setAttribute('data-lkd-invite-counted', 'true');
            this._recordSend();
        }
    }

    /** Mark a send and increment storage. */
    _recordSend() {
        this._lastSendAt = Date.now();
        this.increment();
    }

    /**
     * Increment the invitation count for the current week in storage.
     */
    increment() {
        if (!_isInvitationContextActive) 
            return;
        
        const weekKey = this.getWeekKey(new Date());
        this._incrementChain = (this._incrementChain || Promise.resolve())
            .then(() => getInvitationStats())
            .then((stats) => {
                stats[weekKey] = (stats[weekKey] || 0) + 1;
                return setInvitationStats(stats);
            })
            .catch(() => { _isInvitationContextActive = false; });

        // Prevent _incrementChain itself from being an unhandled rejection
        // if the .catch above rethrows or the chain is abandoned.
        this._incrementChain.catch(() => { });
    }
}
