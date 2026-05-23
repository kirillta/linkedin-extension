/**
 * MemberHider — hides anonymous "LinkedIn Member" profiles on LinkedIn People pages.
 * Setting is stored in chrome.storage.local under memberHiderSettings.hideUnreachable.
 */

class MemberHider {
    constructor() {
        this.enabled = false;
    }

    async loadSettings() {
        const settings = await getMemberHiderSettings();
        this.enabled = settings.hideUnreachable;
    }

    async onStorageChanged(changes) {
        if (!changes.memberHiderSettings) 
            return;
        
        await this.loadSettings();
        this.run();
    }

    /**
     * Scan the People page, mark anonymous cards, then show or hide them.
     * "LinkedIn Member" cards have no /in/ profile link; their textContent
     * starts with "LinkedIn Member" (name is always the first text in the card).
     */
    run() {
        if (!window.location.href.match(/linkedin\.com\/company\/([^/?]+)\/people/)) 
            return;

        try {
            document.querySelectorAll('.artdeco-entity-lockup')
                .forEach((card) => {
                    const text = card.textContent.replace(/\s+/g, ' ').trim();
                    if (text.toLowerCase().startsWith('linkedin member')) 
                        card.setAttribute('data-lkd-unreachable', 'true');
                });

            document.querySelectorAll('[data-lkd-unreachable]').forEach((el) => {
                const li = el.closest('li');
                if (this.enabled) {
                    el.style.setProperty('display', 'none', 'important');
                    if (li) 
                        li.style.setProperty('display', 'none', 'important');
                } else {
                    el.style.removeProperty('display');
                    if (li) 
                        li.style.removeProperty('display');
                }
            });
        } catch (_) { }
    }
}
