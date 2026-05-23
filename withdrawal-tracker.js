/**
 * WithdrawalTracker — records withdrawn connection invitations per ISO-week,
 * attributed to the week the invitation was *sent* (not the current week).
 *
 * Detection flow:
 *   1. Click on <a aria-label^="Withdraw invitation"> → extract sent date from
 *      card text → store pending weekKey + card ref.
 *   2. setTimeout(800): if the card element was removed from the DOM, count it.
 *   3. MutationObserver: "withdrawn" toast text → count only if step 2 hasn't
 *      already fired within the last 5 s.
 *
 * Storage schema (mirrors invitationStats):
 *   withdrawnInvitationStats: { "YYYY-MM-DD": count, … }
 *   where the key is the Monday date (UTC) of the week the invitation was sent.
 */

// Flipped to false on the first caught Extension-context-invalidated error so
// that no further chrome API calls are made for the rest of the page session.
let _isWithdrawalContextActive = true;

class WithdrawalTracker {
    constructor() {
        /**
         * Queue of pending withdrawal items. Each click pushes
         * { card, weekKey, counted: false } so that rapid successive
         * withdrawals are tracked independently.
         */
        this._queue = [];
    }

    /**
     * Return the ISO date string (YYYY-MM-DD) for Monday 00:00 UTC of the week
     * that contains `date`. Identical to InvitationTracker.getWeekKey.
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
     * Parse a LinkedIn relative date string (e.g. "Sent yesterday", "Sent 3 weeks ago")
     * into an absolute Date.
     * @param {string} text
     * @returns {Date}
     */
    _parseRelativeDate(text) {
        const MS_PER_DAY = 86400000;
        
        const lower = text.toLowerCase().trim();
        
        const now = new Date();
        const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

        if (lower.includes('today'))
            return new Date(todayUTC);

        if (lower.includes('yesterday'))
            return new Date(todayUTC - MS_PER_DAY);

        const match = lower.match(/sent (\d+) (hour|day|week|month)s? ago/);
        if (match) {
            const n = parseInt(match[1], 10);
            const unit = match[2];

            if (unit === 'hour')
                return new Date(todayUTC);

            if (unit === 'day')
                return new Date(todayUTC - n * MS_PER_DAY);

            if (unit === 'week')
                return new Date(todayUTC - n * 7 * MS_PER_DAY);

            if (unit === 'month') {
                const d = new Date(todayUTC);
                d.setUTCMonth(d.getUTCMonth() - n);
                return d;
            }
        }

        return new Date(todayUTC);
    }

    /**
     * Walk up from the Withdraw button to the card, find the "Sent …" span,
     * and return the ISO week key for the week the invitation was sent.
     * @param {Element} btn
     * @returns {string}
     */
    _extractSentWeekKey(btn) {
        const card = btn.closest('[role="listitem"]');
        if (!card) 
            return this.getWeekKey(new Date());

        for (const span of card.querySelectorAll('span')) {
            const t = span.textContent.trim();
            if (t.startsWith('Sent '))
                return this.getWeekKey(this._parseRelativeDate(t));
        }

        return this.getWeekKey(new Date());
    }

    /**
     * Attach MutationObserver (toast fallback) and document click listener.
     */
    init() {
        // Toast fallback: watch for "withdrawn" confirmation text added to DOM
        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE)
                        this._checkForWithdrawalToast(node);
                }
            }
        });
        this._observer.observe(document.body, { childList: true, subtree: true });

        // Capture-phase listener catches clicks before LinkedIn's handlers run
        document.addEventListener('click', this._onDocumentClick.bind(this), true);
    }

    /**
     * Detect Withdraw button clicks on the invitation manager page.
     * @param {MouseEvent} event
     */
    _onDocumentClick(event) {
        if (!window.location.href.includes('/invitation-manager/')) 
            return;

        const btn = event.target.closest('a[aria-label^="Withdraw invitation"]');
        if (!btn) 
            return;

        const card = btn.closest('[role="listitem"]');
        const weekKey = this._extractSentWeekKey(btn);
        const item = { card, weekKey, counted: false };
        this._queue.push(item);

        setTimeout(() => {
            if (!item.counted && card && !document.body.contains(card)) {
                item.counted = true;
                this.increment(weekKey);
            }
            
            this._queue = this._queue.filter(i => !i.counted);
        }, 800);
    }

    /**
     * Toast fallback — only fires if card-removal check hasn't already counted
     * this withdrawal within the last 5 seconds.
     * @param {Element} node
     */
    _checkForWithdrawalToast(node) {
        if (node.getAttribute && node.getAttribute('data-lkd-withdraw-counted')) return;

        const text = node.textContent || '';
        if (/withdrawn/i.test(text)) {
            node.setAttribute && node.setAttribute('data-lkd-withdraw-counted', 'true');
        const item = this._queue.find(i => !i.counted);
            if (item) {
                item.counted = true;
                this.increment(item.weekKey);
            } else {
                this.increment(this.getWeekKey(new Date()));
            }
        }
    }

    /**
     * Increment the withdrawn count for `weekKey` in storage.
     * @param {string} weekKey
     */
    increment(weekKey) {
        if (!_isWithdrawalContextActive) 
            return;

        this._incrementChain = (this._incrementChain || Promise.resolve())
            .then(() => getWithdrawnStats())
            .then((stats) => {
                stats[weekKey] = (stats[weekKey] || 0) + 1;
                return setWithdrawnStats(stats);
            })
            .catch(() => { _isWithdrawalContextActive = false; });

        this._incrementChain.catch(() => {});
    }
}
